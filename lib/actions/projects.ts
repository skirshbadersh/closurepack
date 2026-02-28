"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProjectSchema, type CreateProjectValues } from "@/lib/schemas/project";
import type { ActionResult, Jurisdiction } from "@/types";

/**
 * Fetch all jurisdictions for the CUPA dropdown.
 */
export async function getJurisdictions(): Promise<Jurisdiction[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("*")
    .order("cupa_name");

  if (error) {
    console.error("Failed to fetch jurisdictions:", error.message);
    return [];
  }

  return data as Jurisdiction[];
}

/**
 * Create a new project for the current user's tenant.
 */
export async function createProject(
  values: CreateProjectValues
): Promise<ActionResult<{ id: string }>> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const parsed = createProjectSchema.safeParse(values);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { success: false, error: firstError };
  }

  const supabase = createAdminClient();

  // Get user's tenant_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (userError || !user) {
    return { success: false, error: "User not found" };
  }

  // Insert project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      tenant_id: user.tenant_id,
      jurisdiction_id: parsed.data.jurisdiction_id,
      name: parsed.data.name,
      status: "draft",
      closure_type: parsed.data.closure_type,
      facility_name: parsed.data.facility_name,
      facility_street: parsed.data.facility_street,
      facility_city: parsed.data.facility_city,
      facility_state: parsed.data.facility_state,
      facility_zip: parsed.data.facility_zip,
      facility_file_number: parsed.data.facility_file_number || null,
      closure_permit_number: parsed.data.closure_permit_number || null,
      owner_operator_name: parsed.data.owner_operator_name,
      owner_operator_street: parsed.data.owner_operator_street,
      owner_operator_city: parsed.data.owner_operator_city,
      owner_operator_state: parsed.data.owner_operator_state,
      owner_operator_zip: parsed.data.owner_operator_zip,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Failed to create project:", projectError?.message);
    return { success: false, error: "Failed to create project" };
  }

  return { success: true, data: { id: project.id } };
}
