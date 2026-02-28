"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, PhotoLogEntry } from "@/types";

/**
 * Helper: verify project ownership.
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
    .select("id, tenant_id")
    .eq("id", projectId)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (!project) return null;

  return { tenantId: user.tenant_id, supabase };
}

/** Photo with a pre-signed thumbnail URL */
export interface PhotoWithUrl extends PhotoLogEntry {
  signedUrl: string | null;
}

/**
 * Fetch all photos for a project with signed URLs for display.
 */
export async function getProjectPhotos(
  projectId: string
): Promise<PhotoWithUrl[]> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return [];

  const { supabase } = ownership;
  const { data, error } = await supabase
    .from("photo_log_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at");

  if (error) {
    console.error("Failed to fetch photos:", error.message);
    return [];
  }

  const photos = data as PhotoLogEntry[];

  // Generate signed URLs in batch
  if (photos.length === 0) return [];

  const filePaths = photos.map((p) => p.file_path);
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

  return photos.map((photo) => ({
    ...photo,
    signedUrl: urlMap.get(photo.file_path) ?? null,
  }));
}

/**
 * Create a signed upload URL for a photo.
 */
export async function createPhotoUploadUrl(
  projectId: string,
  fileName: string,
  contentType: string
): Promise<ActionResult<{ signedUrl: string; filePath: string }>> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { tenantId, supabase } = ownership;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const filePath = `${tenantId}/${projectId}/photos/${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from("artifacts")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    console.error("Failed to create photo upload URL:", error?.message);
    return { success: false, error: "Failed to create upload URL" };
  }

  return {
    success: true,
    data: { signedUrl: data.signedUrl, filePath },
  };
}

/**
 * Record a photo in the database after successful upload.
 */
export async function recordPhoto(
  projectId: string,
  filePath: string,
  fileName: string
): Promise<ActionResult<{ id: string }>> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { supabase } = ownership;

  // Get next sort_order
  const { data: existing } = await supabase
    .from("photo_log_entries")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("photo_log_entries")
    .insert({
      project_id: projectId,
      file_path: filePath,
      file_name: fileName,
      sort_order: nextOrder,
      caption: "",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to record photo:", error?.message);
    return { success: false, error: "Failed to save photo" };
  }

  return { success: true, data: { id: data.id } };
}

/**
 * Update a photo's caption.
 */
export async function updatePhotoCaption(
  photoId: string,
  projectId: string,
  caption: string
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return { success: false, error: "Not authorized" };

  const { supabase } = ownership;
  const { error } = await supabase
    .from("photo_log_entries")
    .update({ caption })
    .eq("id", photoId)
    .eq("project_id", projectId);

  if (error) {
    console.error("Failed to update caption:", error.message);
    return { success: false, error: "Failed to update caption" };
  }

  return { success: true };
}

/**
 * Update a photo's date.
 */
export async function updatePhotoDate(
  photoId: string,
  projectId: string,
  photoDate: string | null
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return { success: false, error: "Not authorized" };

  const { supabase } = ownership;
  const { error } = await supabase
    .from("photo_log_entries")
    .update({ photo_date: photoDate || null })
    .eq("id", photoId)
    .eq("project_id", projectId);

  if (error) {
    console.error("Failed to update photo date:", error.message);
    return { success: false, error: "Failed to update date" };
  }

  return { success: true };
}

/**
 * Delete a photo from storage and database.
 */
export async function deletePhoto(
  photoId: string,
  projectId: string
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return { success: false, error: "Not authorized" };

  const { supabase } = ownership;

  // Fetch file path
  const { data: photo } = await supabase
    .from("photo_log_entries")
    .select("file_path")
    .eq("id", photoId)
    .eq("project_id", projectId)
    .single();

  if (!photo) return { success: false, error: "Photo not found" };

  // Delete from storage
  await supabase.storage.from("artifacts").remove([photo.file_path]);

  // Delete from database
  const { error } = await supabase
    .from("photo_log_entries")
    .delete()
    .eq("id", photoId)
    .eq("project_id", projectId);

  if (error) {
    console.error("Failed to delete photo:", error.message);
    return { success: false, error: "Failed to delete photo" };
  }

  return { success: true };
}

/**
 * Reorder photos by setting sort_order based on the provided ID array.
 */
export async function reorderPhotos(
  projectId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return { success: false, error: "Not authorized" };

  const { supabase } = ownership;

  // Update each photo's sort_order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("photo_log_entries")
      .update({ sort_order: index + 1 })
      .eq("id", id)
      .eq("project_id", projectId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);

  if (failed?.error) {
    console.error("Failed to reorder photos:", failed.error.message);
    return { success: false, error: "Failed to reorder photos" };
  }

  return { success: true };
}
