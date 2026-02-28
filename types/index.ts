// Shared TypeScript types matching DB schema
// See CLAUDE.md for full database schema

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  clerk_id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

export interface Jurisdiction {
  id: string;
  state: string;
  cupa_name: string;
  cupa_short_name: string | null;
  portal_name: string;
  rules_version: string;
  sources: Record<string, unknown>[];
  cip_allowed: boolean;
  cip_condition: string | null;
  report_deadline_days: number | null;
  report_deadline_from: "sampling_date" | "permit_date" | null;
  report_deadline_alt_days: number | null;
  report_deadline_alt_from: string | null;
  report_deadline_rule: string | null;
  oversight_agency: string | null;
  cupa_contact_name: string | null;
  cupa_contact_phone: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  jurisdiction_id: string | null;
  duplicated_from: string | null;
  name: string;
  status: "draft" | "in_progress" | "ready" | "submitted" | "accepted";
  closure_type: "removal" | "closure_in_place" | null;
  facility_name: string | null;
  facility_street: string | null;
  facility_city: string | null;
  facility_state: string;
  facility_zip: string | null;
  facility_file_number: string | null;
  closure_permit_number: string | null;
  owner_operator_name: string | null;
  owner_operator_street: string | null;
  owner_operator_city: string | null;
  owner_operator_state: string;
  owner_operator_zip: string | null;
  sampling_date: string | null;
  permit_issue_date: string | null;
  report_deadline: string | null;
  last_exported_at: string | null;
  export_override_missing: boolean;
  created_at: string;
  updated_at: string;
}

export interface UST {
  id: string;
  project_id: string;
  cers_tank_id: string | null;
  internal_tank_label: string | null;
  contents: string | null;
  capacity_gallons: number | null;
  closure_date: string | null;
  closure_type: "removal" | "closure_in_place" | "temporary" | null;
  sort_order: number;
  created_at: string;
}

export interface ProjectArtifact {
  id: string;
  project_id: string;
  checklist_item_code: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  notes: string | null;
  uploaded_at: string;
}

export interface PhotoLogEntry {
  id: string;
  project_id: string;
  sort_order: number;
  file_path: string;
  file_name: string | null;
  caption: string | null;
  photo_date: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  code: string;
  category: string;
  title: string;
  description: string | null;
  required: boolean;
  artifact_type: "generated_doc" | "upload" | "system_entry" | "reminder";
  applies_to: string[];
  conditional: string | null;
  source_url: string | null;
  source_description: string | null;
  sort_order: number;
  created_at: string;
}

export interface CupaOverlayItem {
  id: string;
  jurisdiction_id: string;
  base_item_code: string | null;
  override_required: boolean | null;
  override_title: string | null;
  additional_code: string | null;
  additional_title: string | null;
  additional_description: string | null;
  additional_category: string | null;
  additional_artifact_type: string | null;
  additional_applies_to: string[] | null;
  form_url: string | null;
  source_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface ParallelPermit {
  id: string;
  jurisdiction_id: string;
  permit_type: string;
  agency_name: string;
  description: string | null;
  required: boolean;
  source_url: string | null;
  created_at: string;
}

// Server action return type
export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}
