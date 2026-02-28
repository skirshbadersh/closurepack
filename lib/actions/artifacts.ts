"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEffectiveChecklist, groupByCategory, type EffectiveChecklistItem } from "@/lib/checklist/engine";
import type {
  ActionResult,
  Project,
  ProjectArtifact,
  ChecklistItem,
  CupaOverlayItem,
} from "@/types";

/**
 * Helper: verify project ownership and return supabase client + tenant info.
 */
async function verifyProjectOwnership(projectId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (!project) return null;

  return { tenantId: user.tenant_id, project: project as Project, supabase };
}

/**
 * Fetch all artifacts for a project.
 */
export async function getProjectArtifacts(
  projectId: string
): Promise<ProjectArtifact[]> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return [];

  const { supabase } = ownership;
  const { data, error } = await supabase
    .from("project_artifacts")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch artifacts:", error.message);
    return [];
  }

  return data as ProjectArtifact[];
}

/**
 * Get the upload-type checklist items for a project, grouped by category.
 * Returns only items with artifactType === 'upload'.
 */
export async function getUploadChecklist(projectId: string): Promise<{
  items: EffectiveChecklistItem[];
  grouped: Record<string, EffectiveChecklistItem[]>;
} | null> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return null;

  const { project, supabase } = ownership;
  if (!project.jurisdiction_id || !project.closure_type) return null;

  const [baselineResult, overlayResult] = await Promise.all([
    supabase.from("checklist_items").select("*").order("sort_order"),
    supabase
      .from("cupa_overlay_items")
      .select("*")
      .eq("jurisdiction_id", project.jurisdiction_id)
      .order("sort_order"),
  ]);

  const baseline = (baselineResult.data ?? []) as ChecklistItem[];
  const overlays = (overlayResult.data ?? []) as CupaOverlayItem[];

  const effective = buildEffectiveChecklist(baseline, overlays, project.closure_type);
  const uploadItems = effective.filter((item) => item.artifactType === "upload");

  return {
    items: uploadItems,
    grouped: groupByCategory(uploadItems),
  };
}

/**
 * Create a signed upload URL for direct client upload to Supabase Storage.
 * Returns the signed URL and the storage file path.
 */
export async function createUploadUrl(
  projectId: string,
  checklistItemCode: string,
  fileName: string,
  contentType: string
): Promise<ActionResult<{ signedUrl: string; filePath: string }>> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { tenantId, supabase } = ownership;

  // Sanitize filename
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const filePath = `${tenantId}/${projectId}/${checklistItemCode}/${timestamp}_${safeName}`;

  // Create signed upload URL (valid for 5 minutes)
  const { data, error } = await supabase.storage
    .from("artifacts")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    console.error("Failed to create upload URL:", error?.message);
    return { success: false, error: "Failed to create upload URL" };
  }

  return {
    success: true,
    data: {
      signedUrl: data.signedUrl,
      filePath,
    },
  };
}

/**
 * Record an artifact in the database after successful upload.
 */
export async function recordArtifact(
  projectId: string,
  checklistItemCode: string,
  filePath: string,
  fileName: string,
  mimeType: string,
  fileSizeBytes: number
): Promise<ActionResult<{ id: string }>> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { supabase } = ownership;

  const { data, error } = await supabase
    .from("project_artifacts")
    .insert({
      project_id: projectId,
      checklist_item_code: checklistItemCode,
      file_path: filePath,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to record artifact:", error?.message);
    return { success: false, error: "Failed to record artifact" };
  }

  return { success: true, data: { id: data.id } };
}

/**
 * Delete an artifact — removes from storage and database.
 */
export async function deleteArtifact(
  artifactId: string,
  projectId: string
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { supabase } = ownership;

  // Fetch the artifact to get the file path
  const { data: artifact, error: fetchError } = await supabase
    .from("project_artifacts")
    .select("file_path")
    .eq("id", artifactId)
    .eq("project_id", projectId)
    .single();

  if (fetchError || !artifact) {
    return { success: false, error: "Artifact not found" };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("artifacts")
    .remove([artifact.file_path]);

  if (storageError) {
    console.error("Failed to delete from storage:", storageError.message);
    // Continue to delete DB row anyway
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("project_artifacts")
    .delete()
    .eq("id", artifactId)
    .eq("project_id", projectId);

  if (dbError) {
    console.error("Failed to delete artifact record:", dbError.message);
    return { success: false, error: "Failed to delete artifact" };
  }

  return { success: true };
}

/**
 * Generate a signed download URL for viewing/downloading an artifact.
 */
export async function getArtifactUrl(
  artifactId: string,
  projectId: string
): Promise<string | null> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return null;

  const { supabase } = ownership;

  const { data: artifact } = await supabase
    .from("project_artifacts")
    .select("file_path")
    .eq("id", artifactId)
    .eq("project_id", projectId)
    .single();

  if (!artifact) return null;

  const { data } = await supabase.storage
    .from("artifacts")
    .createSignedUrl(artifact.file_path, 3600); // 1 hour

  return data?.signedUrl ?? null;
}
