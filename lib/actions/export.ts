"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, ParallelPermit } from "@/types";

/**
 * Helper: verify project ownership. Returns supabase client + tenant info.
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

/**
 * Fetch parallel permits for a jurisdiction.
 */
export async function getParallelPermits(
  jurisdictionId: string
): Promise<ParallelPermit[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("parallel_permits")
    .select("*")
    .eq("jurisdiction_id", jurisdictionId)
    .order("created_at");

  if (error) {
    console.error("Failed to fetch parallel permits:", error.message);
    return [];
  }

  return data as ParallelPermit[];
}

/**
 * Set export_override_missing flag on a project.
 * This allows the user to export even with missing required items.
 */
export async function setExportOverride(
  projectId: string
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { supabase } = ownership;

  const { error } = await supabase
    .from("projects")
    .update({ export_override_missing: true, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) {
    console.error("Failed to set export override:", error.message);
    return { success: false, error: "Failed to set export override" };
  }

  return { success: true };
}

/**
 * Update project status and last_exported_at timestamp.
 */
export async function updateProjectStatus(
  projectId: string,
  status: "draft" | "in_progress" | "ready" | "submitted" | "accepted"
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { supabase } = ownership;

  const { error } = await supabase
    .from("projects")
    .update({
      status,
      last_exported_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    console.error("Failed to update project status:", error.message);
    return { success: false, error: "Failed to update project status" };
  }

  return { success: true };
}
