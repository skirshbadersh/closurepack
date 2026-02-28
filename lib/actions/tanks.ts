"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tankSchema, type TankFormValues, REQUIRES_SPECIFY } from "@/lib/schemas/tank";
import type { ActionResult, UST } from "@/types";

/**
 * Helper: verify that a project belongs to the current user's tenant.
 * Returns the tenant_id if valid, null otherwise.
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
 * Fetch all USTs for a project, ordered by sort_order.
 */
export async function getProjectTanks(projectId: string): Promise<UST[]> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) return [];

  const { supabase } = ownership;
  const { data, error } = await supabase
    .from("usts")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at");

  if (error) {
    console.error("Failed to fetch tanks:", error.message);
    return [];
  }

  return data as UST[];
}

/**
 * Build the contents string, merging contents + contents_other if needed.
 */
function resolveContents(values: TankFormValues): string {
  if (REQUIRES_SPECIFY.has(values.contents) && values.contents_other.trim()) {
    return `${values.contents}: ${values.contents_other.trim()}`;
  }
  return values.contents;
}

/**
 * Create a new UST for a project.
 */
export async function createTank(
  projectId: string,
  values: TankFormValues
): Promise<ActionResult<{ id: string }>> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const parsed = tankSchema.safeParse(values);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const { supabase } = ownership;

  // Get next sort_order
  const { data: existing } = await supabase
    .from("usts")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { data: tank, error } = await supabase
    .from("usts")
    .insert({
      project_id: projectId,
      cers_tank_id: parsed.data.cers_tank_id || null,
      internal_tank_label: parsed.data.internal_tank_label || null,
      contents: resolveContents(parsed.data),
      capacity_gallons: parsed.data.capacity_gallons,
      closure_date: parsed.data.closure_date,
      closure_type: parsed.data.closure_type,
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error || !tank) {
    console.error("Failed to create tank:", error?.message);
    return { success: false, error: "Failed to create tank" };
  }

  return { success: true, data: { id: tank.id } };
}

/**
 * Update an existing UST.
 */
export async function updateTank(
  tankId: string,
  projectId: string,
  values: TankFormValues
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const parsed = tankSchema.safeParse(values);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const { supabase } = ownership;

  const { error } = await supabase
    .from("usts")
    .update({
      cers_tank_id: parsed.data.cers_tank_id || null,
      internal_tank_label: parsed.data.internal_tank_label || null,
      contents: resolveContents(parsed.data),
      capacity_gallons: parsed.data.capacity_gallons,
      closure_date: parsed.data.closure_date,
      closure_type: parsed.data.closure_type,
    })
    .eq("id", tankId)
    .eq("project_id", projectId);

  if (error) {
    console.error("Failed to update tank:", error.message);
    return { success: false, error: "Failed to update tank" };
  }

  return { success: true };
}

/**
 * Delete a UST.
 */
export async function deleteTank(
  tankId: string,
  projectId: string
): Promise<ActionResult> {
  const ownership = await verifyProjectOwnership(projectId);
  if (!ownership) {
    return { success: false, error: "Not authorized" };
  }

  const { supabase } = ownership;

  const { error } = await supabase
    .from("usts")
    .delete()
    .eq("id", tankId)
    .eq("project_id", projectId);

  if (error) {
    console.error("Failed to delete tank:", error.message);
    return { success: false, error: "Failed to delete tank" };
  }

  return { success: true };
}
