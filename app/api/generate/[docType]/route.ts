import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClosureLetter } from "@/lib/pdf/closure-letter";
import { generateCoverSheet } from "@/lib/pdf/cover-sheet";
import { generatePhotoLog } from "@/lib/pdf/photo-log";
import type { Project, Jurisdiction, UST, PhotoLogEntry } from "@/types";
import type { PhotoWithUrl } from "@/lib/actions/photos";

const VALID_DOC_TYPES = ["closure-letter", "cover-sheet", "photo-log"] as const;
type DocType = (typeof VALID_DOC_TYPES)[number];

const DOC_FILENAMES: Record<DocType, string> = {
  "closure-letter": "Closure_Letter_DRAFT.pdf",
  "cover-sheet": "Cover_Sheet.pdf",
  "photo-log": "Photo_Log.pdf",
};

/**
 * POST /api/generate/[docType]
 * Body: { projectId: string, download?: boolean }
 *
 * Returns a PDF as application/pdf.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docType: string }> }
) {
  const { docType } = await params;

  // Validate doc type
  if (!VALID_DOC_TYPES.includes(docType as DocType)) {
    return NextResponse.json(
      { error: `Invalid document type: ${docType}` },
      { status: 400 }
    );
  }

  // Auth
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse body
  let projectId: string;
  let download = false;
  try {
    const body = await request.json();
    projectId = body.projectId;
    download = body.download === true;
    if (!projectId) throw new Error("Missing projectId");
  } catch {
    return NextResponse.json(
      { error: "Invalid request body — expected { projectId: string }" },
      { status: 400 }
    );
  }

  // Verify project ownership
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const typedProject = project as Project;

  try {
    let pdfBytes: Uint8Array;
    const typedDocType = docType as DocType;

    if (typedDocType === "closure-letter") {
      // Fetch jurisdiction + tanks
      const [jurisdiction, tanks] = await Promise.all([
        typedProject.jurisdiction_id
          ? supabase
              .from("jurisdictions")
              .select("*")
              .eq("id", typedProject.jurisdiction_id)
              .single()
              .then((r) => r.data as Jurisdiction | null)
          : null,
        supabase
          .from("usts")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order")
          .then((r) => (r.data ?? []) as UST[]),
      ]);

      if (!jurisdiction) {
        return NextResponse.json(
          { error: "Jurisdiction not found — set CUPA in project settings" },
          { status: 400 }
        );
      }

      pdfBytes = await generateClosureLetter(typedProject, jurisdiction, tanks);
    } else if (typedDocType === "cover-sheet") {
      const jurisdiction = typedProject.jurisdiction_id
        ? await supabase
            .from("jurisdictions")
            .select("*")
            .eq("id", typedProject.jurisdiction_id)
            .single()
            .then((r) => r.data as Jurisdiction | null)
        : null;

      if (!jurisdiction) {
        return NextResponse.json(
          { error: "Jurisdiction not found — set CUPA in project settings" },
          { status: 400 }
        );
      }

      pdfBytes = await generateCoverSheet(typedProject, jurisdiction);
    } else {
      // photo-log — fetch photos + signed URLs directly (not via server action)
      const { data: photoRows } = await supabase
        .from("photo_log_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order")
        .order("created_at");

      const photoEntries = (photoRows ?? []) as PhotoLogEntry[];
      let photos: PhotoWithUrl[] = [];

      if (photoEntries.length > 0) {
        const filePaths = photoEntries.map((p) => p.file_path);
        const { data: signedUrls } = await supabase.storage
          .from("artifacts")
          .createSignedUrls(filePaths, 3600);

        const urlMap = new Map<string, string>();
        if (signedUrls) {
          for (const item of signedUrls) {
            if (item.signedUrl && item.path) {
              urlMap.set(item.path, item.signedUrl);
            }
          }
        }

        photos = photoEntries.map((photo) => ({
          ...photo,
          signedUrl: urlMap.get(photo.file_path) ?? null,
        }));
      }

      pdfBytes = await generatePhotoLog(typedProject, photos);
    }

    const filename = DOC_FILENAMES[typedDocType];
    const disposition = download
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err) {
    console.error(`Failed to generate ${docType}:`, err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
