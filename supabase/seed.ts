/**
 * ClosurePack Seed Script
 *
 * Seeds the database with:
 * 1. LA County jurisdiction (with all fields populated)
 * 2. California state baseline checklist items (all items from PRD Section 5)
 * 3. LA County CUPA overlay items
 * 4. LA County parallel permits
 *
 * Usage:
 *   npx tsx supabase/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// 1. LA County Jurisdiction
// =============================================================================

const laCountyJurisdiction = {
  state: "CA",
  cupa_name: "LA County Environmental Programs Division",
  cupa_short_name: "LA County",
  portal_name: "CERS",
  rules_version: "2026-02",
  sources: JSON.stringify([
    {
      title: "LA County CleanLA – UST Permits / Closure",
      url: "https://cleanla.lacounty.gov/ust/permits/#closure",
      lastReviewed: "2026-02",
    },
    {
      title: "LA County Closure Report Requirements (PDF)",
      url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
      lastReviewed: "2026-02",
    },
    {
      title: "LA County Closure Authorization Form",
      url: "https://pw.lacounty.gov/general/forms/download/268.pdf",
      lastReviewed: "2026-02",
    },
    {
      title: "CA State Water Board – UST Closure Evaluation Guidance",
      url: "https://www.waterboards.ca.gov/ust/leak_prevention/performance-evaluations/ust_closure.html",
      lastReviewed: "2026-02",
    },
    {
      title: "CCR Title 23 § 2672 – Permanent Closure Requirements",
      url: "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
      lastReviewed: "2026-02",
    },
  ]),
  cip_allowed: false,
  cip_condition:
    "unless PE justification demonstrates removal is not feasible",
  report_deadline_days: 30,
  report_deadline_from: "sampling_date",
  report_deadline_alt_days: 180,
  report_deadline_alt_from: "permit_date",
  report_deadline_rule: "whichever is earlier",
  oversight_agency: "Los Angeles Regional Water Quality Control Board",
  cupa_contact_name: null,
  cupa_contact_phone: null,
};

// =============================================================================
// 2. California State Baseline Checklist Items (PRD Section 5)
// =============================================================================

interface ChecklistItemSeed {
  code: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  artifact_type: string;
  applies_to: string[];
  conditional: string | null;
  source_url: string | null;
  source_description: string;
  sort_order: number;
}

const checklistItems: ChecklistItemSeed[] = [
  // ---------------------------------------------------------------------------
  // 5.1 Pre-Closure (Permit/Planning Phase)
  // ---------------------------------------------------------------------------
  {
    code: "PRE.01",
    category: "pre_closure",
    title: "Closure permit application submitted to CUPA",
    description:
      "Submit the closure permit application to the local CUPA. Form varies by jurisdiction.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "State + Local",
    sort_order: 100,
  },
  {
    code: "PRE.02",
    category: "pre_closure",
    title: "Closure plan describing closure method and sampling plan",
    description:
      "Prepare a closure plan that describes the proposed closure method (removal or closure-in-place) and the soil sampling plan.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.waterboards.ca.gov/ust/leak_prevention/performance-evaluations/ust_closure.html",
    source_description: "Water Board evaluation guidance",
    sort_order: 200,
  },
  {
    code: "PRE.03",
    category: "pre_closure",
    title:
      "Site plan to scale (property lines, structures, USTs, piping, dispensers, remote fills)",
    description:
      "Scaled site plan showing property lines, structures, all USTs with size/content labels, piping layout, dispensers, and remote fills.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure requirements; industry standard elsewhere",
    sort_order: 300,
  },
  {
    code: "PRE.04",
    category: "pre_closure",
    title:
      "CA Professional Engineer's letter for closure-in-place justification",
    description:
      "PE letter providing engineering justification for closure-in-place when removal is not feasible. Required by some CUPAs (e.g., LA County).",
    required: false,
    artifact_type: "upload",
    applies_to: ["closure_in_place"],
    conditional: "Required by CUPA if closure-in-place is proposed",
    source_url: null,
    source_description: "LA County policy; varies by CUPA",
    sort_order: 400,
  },
  {
    code: "PRE.05",
    category: "pre_closure",
    title: "Contractor CSLB license + HAZ certification verification",
    description:
      "Copies of the contractor's CSLB license and HAZ (Hazardous Substance Removal) certification.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "State + Local",
    sort_order: 500,
  },
  {
    code: "PRE.06",
    category: "pre_closure",
    title: "AQMD notification/permit (e.g., South Coast AQMD Rules 1149/1166)",
    description:
      "Air quality management district notification or permit for UST removal activities. Specific rules vary by AQMD jurisdiction.",
    required: true,
    artifact_type: "reminder",
    applies_to: ["both"],
    conditional: "Jurisdiction-dependent; check local AQMD requirements",
    source_url: null,
    source_description: "Local AQMD",
    sort_order: 600,
  },
  {
    code: "PRE.07",
    category: "pre_closure",
    title: "Fire department clearance",
    description:
      "Obtain fire department clearance or permit for UST closure activities.",
    required: true,
    artifact_type: "reminder",
    applies_to: ["both"],
    conditional: "Jurisdiction-dependent",
    source_url: null,
    source_description: "Local fire department",
    sort_order: 700,
  },
  {
    code: "PRE.08",
    category: "pre_closure",
    title: "Building & Safety clearance",
    description:
      "Obtain building and safety department clearance or permit for UST closure activities.",
    required: true,
    artifact_type: "reminder",
    applies_to: ["both"],
    conditional: "Jurisdiction-dependent",
    source_url: null,
    source_description: "Local building & safety",
    sort_order: 800,
  },
  {
    code: "PRE.09",
    category: "pre_closure",
    title: "Closure notification scheduled in CUPA system",
    description:
      "Schedule the closure notification in the CUPA's UST notification system. Specific system varies by CUPA.",
    required: false,
    artifact_type: "system_entry",
    applies_to: ["both"],
    conditional: "CUPA-specific; varies by jurisdiction",
    source_url: null,
    source_description: "LA County UST Notification system; varies by CUPA",
    sort_order: 900,
  },

  // ---------------------------------------------------------------------------
  // 5.2 Closure Activities Documentation
  // ---------------------------------------------------------------------------
  {
    code: "ACT.01",
    category: "closure_activities",
    title: "Tank inerting documentation",
    description:
      "Documentation that the tank was rendered inert (purged of flammable vapors) prior to closure activities. Required for tanks that stored flammable substances.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: "Only if tank contained flammable substance",
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(b)(2), (c)(2)",
    sort_order: 1000,
  },
  {
    code: "ACT.02",
    category: "closure_activities",
    title: "Residual liquid/solid/sludge removal documentation",
    description:
      "Documentation of the removal and disposal of all residual liquids, solids, and sludge from the tank prior to closure.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(b)(1), (c)(1)",
    sort_order: 1100,
  },
  {
    code: "ACT.03",
    category: "closure_activities",
    title: "Tank disposal documentation (where tank went)",
    description:
      "Manifest or receipt documenting where the removed tank was transported for disposal or recycling.",
    required: true,
    artifact_type: "upload",
    applies_to: ["removal"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(b)(3)",
    sort_order: 1200,
  },
  {
    code: "ACT.04",
    category: "closure_activities",
    title: "Tank reuse notification (if applicable)",
    description:
      "If the tank is destined for reuse rather than disposal, a notification letter must be sent to the CUPA.",
    required: true,
    artifact_type: "upload",
    applies_to: ["removal"],
    conditional: "Only if tank is destined for reuse",
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(b)(4)",
    sort_order: 1300,
  },
  {
    code: "ACT.05",
    category: "closure_activities",
    title: "Piping removal/capping documentation",
    description:
      "Documentation that all connected piping has been properly removed or capped/sealed for closure-in-place.",
    required: true,
    artifact_type: "upload",
    applies_to: ["closure_in_place"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(c)(3)",
    sort_order: 1400,
  },
  {
    code: "ACT.06",
    category: "closure_activities",
    title: "Inert solid fill documentation",
    description:
      "Documentation that the tank was filled with an approved inert solid material for closure-in-place.",
    required: true,
    artifact_type: "upload",
    applies_to: ["closure_in_place"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(c)(4)",
    sort_order: 1500,
  },
  {
    code: "ACT.07",
    category: "closure_activities",
    title: "Tank interior atmosphere readings",
    description:
      "Readings of the tank interior atmosphere (LEL, O2, toxics) taken during closure activities. Required by some CUPAs.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: "CUPA-specific requirement; not universal",
    source_url: null,
    source_description: "CUPA-specific practice (e.g., SB County)",
    sort_order: 1600,
  },
  {
    code: "ACT.08",
    category: "closure_activities",
    title: "Photo documentation of closure activities",
    description:
      "Dated, captioned photos documenting all phases of closure activities including excavation, tank condition, sampling, and backfill.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "Industry practice; universally expected by CUPAs",
    sort_order: 1700,
  },

  // ---------------------------------------------------------------------------
  // 5.3 Sampling & Analysis
  // ---------------------------------------------------------------------------
  {
    code: "SAM.01",
    category: "sampling",
    title: "Soil sampling field notes (methods, time/date of collection)",
    description:
      "Field notes documenting soil sampling methods, date/time of collection, sampler name, weather conditions, and sample locations.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(d) + Local",
    sort_order: 1800,
  },
  {
    code: "SAM.02",
    category: "sampling",
    title:
      "Boring logs (soils classification, sample locations, groundwater depth)",
    description:
      "Boring logs showing soils classification (USCS), sample locations/depths, groundwater depth if encountered, and lithologic descriptions.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure report requirements; standard practice",
    sort_order: 1900,
  },
  {
    code: "SAM.03",
    category: "sampling",
    title: "Chain-of-custody forms (field sampler → SWRCB-certified lab)",
    description:
      "Complete chain-of-custody forms documenting sample transfer from field sampler to an SWRCB-certified laboratory.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "State + Local",
    sort_order: 2000,
  },
  {
    code: "SAM.04",
    category: "sampling",
    title:
      "Laboratory analytical results on lab letterhead from SWRCB-certified lab",
    description:
      "Laboratory analytical results on official lab letterhead showing analysis date, extraction methods, analysis methods, and results. Lab must be SWRCB-certified; analysis per § 2649.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(d)(3) + LA County",
    sort_order: 2100,
  },
  {
    code: "SAM.05",
    category: "sampling",
    title: "QA/QC documentation (trip blanks, duplicates, matrix spikes)",
    description:
      "Quality assurance/quality control documentation including trip blanks, field duplicates, matrix spike/matrix spike duplicate results.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "Industry practice; some CUPAs explicit",
    sort_order: 2200,
  },
  {
    code: "SAM.06",
    category: "sampling",
    title: "Groundwater depth documentation",
    description:
      "Documentation of groundwater depth encountered (or not encountered) during drilling/excavation activities.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure report requirements; standard practice",
    sort_order: 2300,
  },
  {
    code: "SAM.07",
    category: "sampling",
    title:
      "Observations of site contamination (visual/olfactory evidence)",
    description:
      "Documentation of any visual or olfactory evidence of contamination observed during closure activities (staining, odors, sheen, free product).",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure report requirements; standard practice",
    sort_order: 2400,
  },

  // ---------------------------------------------------------------------------
  // 5.4 Waste Disposal
  // ---------------------------------------------------------------------------
  {
    code: "DSP.01",
    category: "waste_disposal",
    title: "Hazardous waste manifests (removed soil, tank rinsate)",
    description:
      "Copies of all hazardous waste manifests for soil, rinsate, and other hazardous materials removed during closure.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "State + Local",
    sort_order: 2500,
  },
  {
    code: "DSP.02",
    category: "waste_disposal",
    title: "Non-hazardous soil disposal documentation",
    description:
      "Receipts or manifests documenting the disposal of non-hazardous soil removed during closure activities.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure report requirements; standard practice",
    sort_order: 2600,
  },
  {
    code: "DSP.03",
    category: "waste_disposal",
    title: "Tank disposal manifests/receipts",
    description:
      "Manifests or receipts documenting the transport and disposal/recycling of the removed tank(s).",
    required: true,
    artifact_type: "upload",
    applies_to: ["removal"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(b)(3)",
    sort_order: 2700,
  },

  // ---------------------------------------------------------------------------
  // 5.5 Closure Report (Compiled Document)
  // ---------------------------------------------------------------------------
  {
    code: "RPT.01",
    category: "report",
    title: "Facility file number and closure permit number",
    description:
      "Include the CUPA facility file number and closure permit number in the closure report header.",
    required: false,
    artifact_type: "system_entry",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure report requirements; standard practice",
    sort_order: 2800,
  },
  {
    code: "RPT.02",
    category: "report",
    title:
      "Plot plan to scale with sampling points, buildings, streets, north arrow",
    description:
      "Scaled plot plan showing sampling point locations, nearby buildings, streets, north arrow, and all relevant site features.",
    required: true,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "State + Local",
    sort_order: 2900,
  },
  {
    code: "RPT.03",
    category: "report",
    title:
      "Professional certification/signature (CA PG, CEG, or PE with soils experience)",
    description:
      "Closure report must be signed/certified by a California Professional Geologist, Certified Engineering Geologist, or Professional Engineer with soils experience.",
    required: false,
    artifact_type: "upload",
    applies_to: ["both"],
    conditional: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    source_description:
      "LA County closure report requirements; state regs require demonstration to satisfaction of local agency",
    sort_order: 3000,
  },
  {
    code: "RPT.04",
    category: "report",
    title: "UST Closure Notification Letter (State Water Board template)",
    description:
      "Pre-filled draft of the State Water Board-approved UST Closure Notification Letter. Watermarked DRAFT — FOR CUPA USE.",
    required: true,
    artifact_type: "generated_doc",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.waterboards.ca.gov/ust/docs/ust-closure-letter-template-final.pdf",
    source_description: "Water Board evaluation guidance",
    sort_order: 3100,
  },
  {
    code: "RPT.05",
    category: "report",
    title: "Cover sheet + table of contents",
    description:
      "Generated cover sheet and table of contents for the closure package.",
    required: true,
    artifact_type: "generated_doc",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "Industry practice",
    sort_order: 3200,
  },
  {
    code: "RPT.06",
    category: "report",
    title: "Photo log (captioned, ordered)",
    description:
      "Generated photo log with dated, captioned, and ordered photos of closure activities.",
    required: true,
    artifact_type: "generated_doc",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description: "Industry practice",
    sort_order: 3300,
  },

  // ---------------------------------------------------------------------------
  // 5.6 Post-Closure
  // ---------------------------------------------------------------------------
  {
    code: "POST.01",
    category: "post_closure",
    title: "CERS submittal updated (closure type + date per tank)",
    description:
      "Update CERS facility submittal to reflect closure type and closure date for each tank. Step-by-step instructions provided by ClosurePack.",
    required: true,
    artifact_type: "system_entry",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.waterboards.ca.gov/ust/cers/bu14_reporting_closure_and_new_installation.html",
    source_description: "State + Local",
    sort_order: 3400,
  },
  {
    code: "POST.02",
    category: "post_closure",
    title: "Closure report submitted to CUPA within deadline",
    description:
      "Submit the compiled closure report/package to the CUPA within the jurisdiction-specific deadline. Deadline varies by CUPA.",
    required: true,
    artifact_type: "reminder",
    applies_to: ["both"],
    conditional: null,
    source_url: null,
    source_description:
      "Local; LA County: 30 days from sampling or 180 days from permit, whichever is earlier",
    sort_order: 3500,
  },
  {
    code: "POST.03",
    category: "post_closure",
    title: "Analytical records retained for ≥36 months",
    description:
      "Retain all analytical results and related records for a minimum of 36 months following completion of permanent closure.",
    required: true,
    artifact_type: "reminder",
    applies_to: ["both"],
    conditional: null,
    source_url:
      "https://www.law.cornell.edu/regulations/california/23-CCR-2672",
    source_description: "CCR § 2672(f)",
    sort_order: 3600,
  },
];

// =============================================================================
// 3. LA County CUPA Overlay Items
// =============================================================================

interface OverlayItemSeed {
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
}

const laCountyOverlayItems: OverlayItemSeed[] = [
  // Overrides: items that LA County explicitly requires (vs. just standard practice elsewhere)
  {
    base_item_code: "PRE.01",
    override_required: null,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: "https://pw.lacounty.gov/general/forms/download/268.pdf",
    source_url: "https://cleanla.lacounty.gov/ust/permits/#closure",
    sort_order: 100,
  },
  {
    base_item_code: "PRE.03",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 200,
  },
  {
    base_item_code: "PRE.04",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 300,
  },
  {
    base_item_code: "PRE.09",
    override_required: true,
    override_title: "Closure notification scheduled in LA County UST system",
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://cleanla.lacounty.gov/ust/permits/#closure",
    sort_order: 400,
  },
  {
    base_item_code: "SAM.02",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 500,
  },
  {
    base_item_code: "SAM.05",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 600,
  },
  {
    base_item_code: "SAM.06",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 700,
  },
  {
    base_item_code: "SAM.07",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 800,
  },
  {
    base_item_code: "DSP.02",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 900,
  },
  {
    base_item_code: "RPT.01",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 1000,
  },
  {
    base_item_code: "RPT.03",
    override_required: true,
    override_title: null,
    additional_code: null,
    additional_title: null,
    additional_description: null,
    additional_category: null,
    additional_artifact_type: null,
    additional_applies_to: null,
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 1100,
  },

  // Net-new LA County-specific items
  {
    base_item_code: null,
    override_required: null,
    override_title: null,
    additional_code: "LA.ACT.07",
    additional_title: "Tank interior atmosphere readings (LA County)",
    additional_description:
      "LEL, O2, and toxics readings of tank interior atmosphere taken during closure activities. Required by LA County CUPA.",
    additional_category: "closure_activities",
    additional_artifact_type: "upload",
    additional_applies_to: ["both"],
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 1200,
  },
  {
    base_item_code: null,
    override_required: null,
    override_title: null,
    additional_code: "LA.RPT.07",
    additional_title: "Closure report submitted within LA County deadline",
    additional_description:
      "Closure report must be submitted within 30 days of sampling date or 180 days of permit issuance, whichever is earlier.",
    additional_category: "post_closure",
    additional_artifact_type: "reminder",
    additional_applies_to: ["both"],
    form_url: null,
    source_url: "https://pw.lacounty.gov/epd/ust/PDF/3439.pdf",
    sort_order: 1300,
  },
];

// =============================================================================
// 4. LA County Parallel Permits
// =============================================================================

interface ParallelPermitSeed {
  permit_type: string;
  agency_name: string;
  description: string;
  required: boolean;
  source_url: string | null;
}

const laCountyParallelPermits: ParallelPermitSeed[] = [
  {
    permit_type: "AQMD",
    agency_name: "South Coast Air Quality Management District (SCAQMD)",
    description:
      "Notification and/or permit required under Rule 1149 (Storage Tank and Pipeline Cleaning and Degassing) and Rule 1166 (Volatile Organic Compound Emissions from Decontamination of Soil). Contact SCAQMD before beginning closure activities.",
    required: true,
    source_url: "http://www.aqmd.gov/home/rules-compliance",
  },
  {
    permit_type: "fire_department",
    agency_name: "LA County Fire Department – Health Hazardous Materials Division",
    description:
      "Fire department clearance or permit may be required for UST removal activities. Contact your local fire station or the LA County Fire Department HHMD for requirements.",
    required: true,
    source_url: null,
  },
  {
    permit_type: "building_safety",
    agency_name: "LA County Department of Public Works – Building & Safety Division",
    description:
      "Building & Safety clearance or demolition permit may be required for UST removal, especially if canopy or dispenser island demolition is involved.",
    required: true,
    source_url: null,
  },
];

// =============================================================================
// Seed Execution
// =============================================================================

async function seed() {
  console.log("🌱 Starting ClosurePack seed...\n");

  // -------------------------------------------------------------------------
  // Step 1: Insert LA County jurisdiction
  // -------------------------------------------------------------------------
  console.log("1/4  Inserting LA County jurisdiction...");
  const { data: jurisdiction, error: jurError } = await supabase
    .from("jurisdictions")
    .upsert(laCountyJurisdiction, { onConflict: "cupa_name" })
    .select()
    .single();

  if (jurError) {
    // If upsert on cupa_name fails (no unique constraint), try insert
    const { data: jurInsert, error: jurInsertError } = await supabase
      .from("jurisdictions")
      .insert(laCountyJurisdiction)
      .select()
      .single();

    if (jurInsertError) {
      console.error("  ❌ Failed to insert jurisdiction:", jurInsertError.message);
      process.exit(1);
    }
    console.log(`  ✅ Jurisdiction inserted: ${jurInsert.cupa_name} (${jurInsert.id})`);
    await seedChecklist(jurInsert.id);
    return;
  }

  console.log(`  ✅ Jurisdiction upserted: ${jurisdiction.cupa_name} (${jurisdiction.id})`);
  await seedChecklist(jurisdiction.id);
}

async function seedChecklist(jurisdictionId: string) {
  // -------------------------------------------------------------------------
  // Step 2: Insert state baseline checklist items
  // -------------------------------------------------------------------------
  console.log("\n2/4  Inserting state baseline checklist items...");
  const { data: insertedItems, error: checklistError } = await supabase
    .from("checklist_items")
    .upsert(checklistItems, { onConflict: "code" })
    .select("code");

  if (checklistError) {
    console.error("  ❌ Failed to insert checklist items:", checklistError.message);
    process.exit(1);
  }
  console.log(`  ✅ ${insertedItems?.length ?? 0} checklist items upserted`);

  // -------------------------------------------------------------------------
  // Step 3: Insert LA County overlay items
  // -------------------------------------------------------------------------
  console.log("\n3/4  Inserting LA County CUPA overlay items...");
  const overlayRows = laCountyOverlayItems.map((item) => ({
    jurisdiction_id: jurisdictionId,
    ...item,
  }));

  // Delete existing overlays for this jurisdiction to avoid duplicates on re-seed
  await supabase
    .from("cupa_overlay_items")
    .delete()
    .eq("jurisdiction_id", jurisdictionId);

  const { data: insertedOverlays, error: overlayError } = await supabase
    .from("cupa_overlay_items")
    .insert(overlayRows)
    .select("id");

  if (overlayError) {
    console.error("  ❌ Failed to insert overlay items:", overlayError.message);
    process.exit(1);
  }
  console.log(`  ✅ ${insertedOverlays?.length ?? 0} overlay items inserted`);

  // -------------------------------------------------------------------------
  // Step 4: Insert LA County parallel permits
  // -------------------------------------------------------------------------
  console.log("\n4/4  Inserting LA County parallel permits...");
  const permitRows = laCountyParallelPermits.map((p) => ({
    jurisdiction_id: jurisdictionId,
    ...p,
  }));

  // Delete existing permits for this jurisdiction to avoid duplicates on re-seed
  await supabase
    .from("parallel_permits")
    .delete()
    .eq("jurisdiction_id", jurisdictionId);

  const { data: insertedPermits, error: permitError } = await supabase
    .from("parallel_permits")
    .insert(permitRows)
    .select("id");

  if (permitError) {
    console.error("  ❌ Failed to insert parallel permits:", permitError.message);
    process.exit(1);
  }
  console.log(`  ✅ ${insertedPermits?.length ?? 0} parallel permits inserted`);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("✅ Seed complete!");
  console.log(`   Jurisdiction:    1 (LA County)`);
  console.log(`   Checklist items: ${insertedItems?.length ?? 0}`);
  console.log(`   Overlay items:   ${insertedOverlays?.length ?? 0}`);
  console.log(`   Parallel permits: ${insertedPermits?.length ?? 0}`);
  console.log("=".repeat(60));
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
