import archiver from "archiver";
import { PassThrough } from "stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateClosureLetter } from "@/lib/pdf/closure-letter";
import { generateCoverSheet } from "@/lib/pdf/cover-sheet";
import { generatePhotoLog } from "@/lib/pdf/photo-log";
import { generateSubmissionChecklist } from "@/lib/pdf/submission-checklist";
import type { Project, Jurisdiction, UST, ProjectArtifact, ParallelPermit } from "@/types";
import type { PhotoWithUrl } from "@/lib/actions/photos";

/**
 * Map checklist item codes to deterministic ZIP filenames.
 * Items not in this map go into 10_AdditionalDocuments/.
 */
const ARTIFACT_CODE_TO_FILENAME: Record<string, string> = {
  "PRE.03": "04_SitePlan",
  "SAM.04": "05_LabResults",
  "SAM.03": "06_ChainOfCustody",
  "DSP.01": "07_HazWasteManifests",
  "DSP.03": "08_TankDisposal",
  "SAM.02": "09_BoringLogs",
};

/**
 * Get file extension from a filename or mime type.
 */
function getExtension(fileName: string, mimeType: string | null): string {
  // Try to get from filename first
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx > 0) {
    return fileName.slice(dotIdx);
  }
  // Fallback to mime type
  if (mimeType?.includes("pdf")) return ".pdf";
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return ".jpg";
  if (mimeType?.includes("png")) return ".png";
  return "";
}

/**
 * Assemble the complete closure package ZIP.
 *
 * Returns a Buffer containing the ZIP file.
 */
export async function buildExportZip(
  project: Project,
  jurisdiction: Jurisdiction,
  tanks: UST[],
  photos: PhotoWithUrl[],
  artifacts: ProjectArtifact[],
  parallelPermits: ParallelPermit[],
  supabase: SupabaseClient
): Promise<Buffer> {
  // Generate all PDFs in parallel
  const [coverSheetBytes, closureLetterBytes, photoLogBytes, submissionChecklistBytes] =
    await Promise.all([
      generateCoverSheet(project, jurisdiction),
      generateClosureLetter(project, jurisdiction, tanks),
      generatePhotoLog(project, photos),
      generateSubmissionChecklist(project, jurisdiction, tanks, parallelPermits),
    ]);

  // Create ZIP archive
  const archive = archiver("zip", { zlib: { level: 6 } });
  const buffers: Buffer[] = [];
  const passThrough = new PassThrough();

  passThrough.on("data", (chunk: Buffer) => buffers.push(chunk));

  const finalized = new Promise<Buffer>((resolve, reject) => {
    passThrough.on("end", () => resolve(Buffer.concat(buffers)));
    archive.on("error", (err) => reject(err));
  });

  archive.pipe(passThrough);

  // --- Add generated PDFs ---
  // Note: CoverSheet includes TOC on page 2, so it's both 00 and 01
  archive.append(Buffer.from(coverSheetBytes), { name: "00_CoverSheet_and_TOC.pdf" });
  archive.append(Buffer.from(closureLetterBytes), { name: "02_ClosureLetter_DRAFT.pdf" });
  archive.append(Buffer.from(photoLogBytes), { name: "03_PhotoLog.pdf" });

  // --- Add uploaded artifacts with deterministic naming ---
  // Group artifacts by checklist item code
  const artifactsByCode = new Map<string, ProjectArtifact[]>();
  for (const artifact of artifacts) {
    const existing = artifactsByCode.get(artifact.checklist_item_code) ?? [];
    existing.push(artifact);
    artifactsByCode.set(artifact.checklist_item_code, existing);
  }

  // Fetch all artifact files from Supabase Storage and add to ZIP
  const allPaths = artifacts.map((a) => a.file_path);
  const signedUrlMap = new Map<string, string>();

  if (allPaths.length > 0) {
    // Batch signed URLs (up to 100 at a time)
    for (let i = 0; i < allPaths.length; i += 100) {
      const batch = allPaths.slice(i, i + 100);
      const { data: signedUrls } = await supabase.storage
        .from("artifacts")
        .createSignedUrls(batch, 3600);

      if (signedUrls) {
        for (const item of signedUrls) {
          if (item.signedUrl && item.path) {
            signedUrlMap.set(item.path, item.signedUrl);
          }
        }
      }
    }
  }

  // Process each code group
  for (const [code, codeArtifacts] of artifactsByCode.entries()) {
    const baseFilename = ARTIFACT_CODE_TO_FILENAME[code];

    if (baseFilename) {
      // Known artifact type — use deterministic naming
      if (codeArtifacts.length === 1) {
        const artifact = codeArtifacts[0];
        const ext = getExtension(artifact.file_name, artifact.mime_type);
        const zipName = `${baseFilename}${ext}`;
        const fileBuffer = await fetchFile(signedUrlMap.get(artifact.file_path));
        if (fileBuffer) {
          archive.append(fileBuffer, { name: zipName });
        }
      } else {
        // Multiple artifacts: suffix with a, b, c...
        for (let i = 0; i < codeArtifacts.length; i++) {
          const artifact = codeArtifacts[i];
          const ext = getExtension(artifact.file_name, artifact.mime_type);
          const suffix = String.fromCharCode(97 + i); // a, b, c...
          const zipName = `${baseFilename}${suffix}${ext}`;
          const fileBuffer = await fetchFile(signedUrlMap.get(artifact.file_path));
          if (fileBuffer) {
            archive.append(fileBuffer, { name: zipName });
          }
        }
      }
    } else {
      // Unknown code — put in AdditionalDocuments folder
      for (const artifact of codeArtifacts) {
        const fileBuffer = await fetchFile(signedUrlMap.get(artifact.file_path));
        if (fileBuffer) {
          archive.append(fileBuffer, {
            name: `10_AdditionalDocuments/${artifact.file_name}`,
          });
        }
      }
    }
  }

  // --- Add submission checklist ---
  archive.append(Buffer.from(submissionChecklistBytes), {
    name: "11_SubmissionChecklist.pdf",
  });

  // Finalize the archive
  await archive.finalize();
  return finalized;
}

/**
 * Fetch a file from a signed URL and return as Buffer.
 * Returns null on failure.
 */
async function fetchFile(signedUrl: string | undefined): Promise<Buffer | null> {
  if (!signedUrl) return null;
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("Failed to fetch file for ZIP:", err instanceof Error ? err.message : err);
    return null;
  }
}
