import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildExportZip } from "@/lib/export/zip-builder";
import { buildEffectiveChecklist } from "@/lib/checklist/engine";
import { checkCompleteness } from "@/lib/checklist/completeness";
import type {
  Project,
  Jurisdiction,
  UST,
  ChecklistItem,
  CupaOverlayItem,
  ProjectArtifact,
  PhotoLogEntry,
  ParallelPermit,
} from "@/types";
import type { PhotoWithUrl } from "@/lib/actions/photos";

/**
 * POST /api/export
 * Body: { projectId: string }
 *
 * Assembles and returns the complete closure package ZIP.
 * Updates project status on success.
 */
export async function POST(request: NextRequest) {
  // Auth
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse body
  let projectId: string;
  try {
    const body = await request.json();
    projectId = body.projectId;
    if (!projectId) throw new Error("Missing projectId");
  } catch {
    return NextResponse.json(
      { error: "Invalid request body — expected { projectId: string }" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify user + tenant
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
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const typedProject = project as Project;

  if (!typedProject.jurisdiction_id || !typedProject.closure_type) {
    return NextResponse.json(
      { error: "Project missing jurisdiction or closure type" },
      { status: 400 }
    );
  }

  try {
    // Fetch all data in parallel
    const [
      baselineResult,
      overlayResult,
      artifactsResult,
      tanksResult,
      photoResult,
      jurisdictionResult,
      permitsResult,
      ustsCountResult,
    ] = await Promise.all([
      supabase.from("checklist_items").select("*").order("sort_order"),
      supabase
        .from("cupa_overlay_items")
        .select("*")
        .eq("jurisdiction_id", typedProject.jurisdiction_id)
        .order("sort_order"),
      supabase
        .from("project_artifacts")
        .select("*")
        .eq("project_id", projectId),
      supabase
        .from("usts")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order"),
      supabase
        .from("photo_log_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order"),
      supabase
        .from("jurisdictions")
        .select("*")
        .eq("id", typedProject.jurisdiction_id)
        .single(),
      supabase
        .from("parallel_permits")
        .select("*")
        .eq("jurisdiction_id", typedProject.jurisdiction_id)
        .order("created_at"),
      supabase
        .from("usts")
        .select("id")
        .eq("project_id", projectId),
    ]);

    const baseline = (baselineResult.data ?? []) as ChecklistItem[];
    const overlays = (overlayResult.data ?? []) as CupaOverlayItem[];
    const artifacts = (artifactsResult.data ?? []) as ProjectArtifact[];
    const tanks = (tanksResult.data ?? []) as UST[];
    const photoEntries = (photoResult.data ?? []) as PhotoLogEntry[];
    const jurisdiction = jurisdictionResult.data as Jurisdiction | null;
    const parallelPermits = (permitsResult.data ?? []) as ParallelPermit[];
    const ustCount = ustsCountResult.data?.length ?? 0;

    if (!jurisdiction) {
      return NextResponse.json(
        { error: "Jurisdiction not found" },
        { status: 400 }
      );
    }

    // Run completeness check
    const effective = buildEffectiveChecklist(
      baseline,
      overlays,
      typedProject.closure_type
    );

    const systemEntries = new Set<string>();
    if (ustCount > 0) systemEntries.add("ACT.01");

    const completeness = checkCompleteness(effective, artifacts, {
      hasSystemEntries: systemEntries,
    });

    // Check if export is allowed
    const isComplete =
      completeness.satisfiedRequired === completeness.totalRequired;
    if (!isComplete && !typedProject.export_override_missing) {
      return NextResponse.json(
        {
          error: "Missing required items. Set export override first.",
          missing: completeness.totalRequired - completeness.satisfiedRequired,
        },
        { status: 400 }
      );
    }

    // Build photo list with signed URLs
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

    // Build the ZIP
    const zipBuffer = await buildExportZip(
      typedProject,
      jurisdiction,
      tanks,
      photos,
      artifacts,
      parallelPermits,
      supabase
    );

    // Update project status
    const newStatus = isComplete ? "ready" : "in_progress";
    await supabase
      .from("projects")
      .update({
        status: newStatus,
        last_exported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    // Build filename
    const facilitySlug = (typedProject.facility_name || "Project")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_");
    const dateSlug = new Date().toISOString().slice(0, 10);
    const zipFilename = `${facilitySlug}_Closure_Package_${dateSlug}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    console.error("Failed to build export ZIP:", err);
    return NextResponse.json(
      { error: "Failed to generate export package" },
      { status: 500 }
    );
  }
}
