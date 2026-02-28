"use server";

import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProjectSchema, type CreateProjectValues } from "@/lib/schemas/project";
import { buildEffectiveChecklist } from "@/lib/checklist/engine";
import { checkCompleteness, type CompletenessResult } from "@/lib/checklist/completeness";
import type {
  ActionResult,
  Jurisdiction,
  Project,
  ChecklistItem,
  CupaOverlayItem,
  ProjectArtifact,
} from "@/types";

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

/**
 * Fetch a project by ID, verifying it belongs to the current user's tenant.
 */
export async function getProject(
  projectId: string
): Promise<Project | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const supabase = createAdminClient();

  // Get user's tenant_id
  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("clerk_id", clerkUser.id)
    .single();

  if (!user) return null;

  // Fetch project scoped to tenant
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("tenant_id", user.tenant_id)
    .single();

  if (error || !project) return null;

  return project as Project;
}

/**
 * Fetch the jurisdiction for a project.
 */
export async function getProjectJurisdiction(
  jurisdictionId: string
): Promise<Jurisdiction | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("*")
    .eq("id", jurisdictionId)
    .single();

  if (error || !data) return null;
  return data as Jurisdiction;
}

/**
 * Build the effective checklist for a project, with completeness status.
 * Fetches baseline items, CUPA overlays, and project artifacts, then
 * runs the checklist engine + completeness check.
 */
export async function getProjectChecklist(
  project: Project
): Promise<CompletenessResult | null> {
  if (!project.jurisdiction_id || !project.closure_type) return null;

  const supabase = createAdminClient();

  // Fetch all three data sources in parallel
  const [baselineResult, overlayResult, artifactsResult, ustsResult] =
    await Promise.all([
      supabase
        .from("checklist_items")
        .select("*")
        .order("sort_order"),
      supabase
        .from("cupa_overlay_items")
        .select("*")
        .eq("jurisdiction_id", project.jurisdiction_id)
        .order("sort_order"),
      supabase
        .from("project_artifacts")
        .select("*")
        .eq("project_id", project.id),
      supabase
        .from("usts")
        .select("id")
        .eq("project_id", project.id),
    ]);

  const baselineItems = (baselineResult.data ?? []) as ChecklistItem[];
  const overlayItems = (overlayResult.data ?? []) as CupaOverlayItem[];
  const artifacts = (artifactsResult.data ?? []) as ProjectArtifact[];
  const ustCount = ustsResult.data?.length ?? 0;

  // Build effective checklist
  const effective = buildEffectiveChecklist(
    baselineItems,
    overlayItems,
    project.closure_type
  );

  // Determine which system entries are satisfied
  const systemEntries = new Set<string>();
  if (ustCount > 0) {
    // If tanks have been entered, mark tank-related system entries
    systemEntries.add("ACT.01"); // Tank inventory is a system entry
  }

  // Run completeness check
  return checkCompleteness(effective, artifacts, {
    hasSystemEntries: systemEntries,
  });
}
