// Checklist engine: merges state baseline with CUPA-specific overlays
// See CLAUDE.md for the merge logic pseudocode

import type { ChecklistItem, CupaOverlayItem } from "@/types";

export interface EffectiveChecklistItem {
  code: string;
  category: string;
  title: string;
  description: string | null;
  required: boolean;
  artifactType: "generated_doc" | "upload" | "system_entry" | "reminder";
  appliesTo: string[];
  conditional: string | null;
  sourceUrl: string | null;
  sourceDescription: string | null;
  formUrl: string | null;
  isCupaSpecific: boolean;
  satisfied: boolean;
  sortOrder: number;
}

/** Category sort priority for deterministic ordering */
const CATEGORY_ORDER: Record<string, number> = {
  pre_closure: 0,
  closure_activities: 1,
  sampling: 2,
  waste_disposal: 3,
  report: 4,
  post_closure: 5,
};

/**
 * Build the effective checklist by merging state baseline items
 * with CUPA-specific overlay items, filtered by closure type.
 */
export function buildEffectiveChecklist(
  baselineItems: ChecklistItem[],
  overlayItems: CupaOverlayItem[],
  closureType: "removal" | "closure_in_place"
): EffectiveChecklistItem[] {
  // 1. Filter baseline items by closure type
  const filtered = baselineItems.filter((item) => {
    return (
      item.applies_to.includes("both") ||
      item.applies_to.includes(closureType)
    );
  });

  // 2. Convert to effective items
  const effectiveMap = new Map<string, EffectiveChecklistItem>();

  for (const item of filtered) {
    effectiveMap.set(item.code, {
      code: item.code,
      category: item.category,
      title: item.title,
      description: item.description,
      required: item.required,
      artifactType: item.artifact_type,
      appliesTo: item.applies_to,
      conditional: item.conditional,
      sourceUrl: item.source_url,
      sourceDescription: item.source_description,
      formUrl: null,
      isCupaSpecific: false,
      satisfied: false,
      sortOrder: item.sort_order,
    });
  }

  // 3. Apply overlay modifications and add new items
  for (const overlay of overlayItems) {
    // Modification of existing baseline item
    if (overlay.base_item_code && effectiveMap.has(overlay.base_item_code)) {
      const existing = effectiveMap.get(overlay.base_item_code)!;

      if (overlay.override_required !== null) {
        existing.required = overlay.override_required;
      }
      if (overlay.override_title) {
        existing.title = overlay.override_title;
      }
      if (overlay.form_url) {
        existing.formUrl = overlay.form_url;
      }
      if (overlay.source_url) {
        existing.sourceUrl = overlay.source_url;
      }

      existing.isCupaSpecific = true;
    }

    // Net-new CUPA-specific item
    if (overlay.additional_code && overlay.additional_title) {
      const appliesTo = overlay.additional_applies_to ?? ["both"];

      // Filter by closure type
      if (
        !appliesTo.includes("both") &&
        !appliesTo.includes(closureType)
      ) {
        continue;
      }

      effectiveMap.set(overlay.additional_code, {
        code: overlay.additional_code,
        category: overlay.additional_category ?? "post_closure",
        title: overlay.additional_title,
        description: overlay.additional_description,
        required: true,
        artifactType: (overlay.additional_artifact_type as EffectiveChecklistItem["artifactType"]) ?? "upload",
        appliesTo,
        conditional: null,
        sourceUrl: overlay.source_url,
        sourceDescription: null,
        formUrl: overlay.form_url,
        isCupaSpecific: true,
        satisfied: false,
        sortOrder: overlay.sort_order,
      });
    }
  }

  // 4. Sort by category order, then sort_order within category
  const items = Array.from(effectiveMap.values());
  items.sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) return catA - catB;
    return a.sortOrder - b.sortOrder;
  });

  return items;
}

/** Human-readable category labels */
export const CATEGORY_LABELS: Record<string, string> = {
  pre_closure: "Pre-Closure",
  closure_activities: "Closure Activities",
  sampling: "Sampling & Analysis",
  waste_disposal: "Waste Disposal",
  report: "Closure Report",
  post_closure: "Post-Closure",
};

/** Group effective checklist items by category */
export function groupByCategory(
  items: EffectiveChecklistItem[]
): Record<string, EffectiveChecklistItem[]> {
  const groups: Record<string, EffectiveChecklistItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  }
  return groups;
}
