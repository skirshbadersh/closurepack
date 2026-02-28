// Completeness validation: checks project against effective checklist

import type { ProjectArtifact } from "@/types";
import type { EffectiveChecklistItem } from "./engine";

export interface CompletenessResult {
  checklist: EffectiveChecklistItem[];
  totalRequired: number;
  satisfiedRequired: number;
  percentComplete: number;
}

/**
 * Mark each checklist item as satisfied or not based on uploaded artifacts
 * and other project state. Returns a new array (does not mutate input).
 *
 * Satisfaction rules per artifact_type:
 * - upload: has at least one matching project_artifact row
 * - generated_doc: has been generated (tracked externally; for now always false)
 * - system_entry: depends on item code (e.g., tank inventory)
 * - reminder: always satisfied (informational only, doesn't block export)
 */
export function checkCompleteness(
  checklist: EffectiveChecklistItem[],
  artifacts: ProjectArtifact[],
  options: {
    hasGeneratedDocs?: Set<string>;
    hasSystemEntries?: Set<string>;
  } = {}
): CompletenessResult {
  const { hasGeneratedDocs = new Set(), hasSystemEntries = new Set() } =
    options;

  // Build a set of checklist codes that have at least one artifact
  const artifactCodes = new Set(artifacts.map((a) => a.checklist_item_code));

  const updated = checklist.map((item) => {
    let satisfied = false;

    switch (item.artifactType) {
      case "upload":
        satisfied = artifactCodes.has(item.code);
        break;
      case "generated_doc":
        satisfied = hasGeneratedDocs.has(item.code);
        break;
      case "system_entry":
        satisfied = hasSystemEntries.has(item.code);
        break;
      case "reminder":
        // Reminders are informational only — always satisfied
        satisfied = true;
        break;
    }

    return { ...item, satisfied };
  });

  const requiredItems = updated.filter((i) => i.required);
  const satisfiedRequired = requiredItems.filter((i) => i.satisfied).length;
  const totalRequired = requiredItems.length;
  const percentComplete =
    totalRequired > 0 ? Math.round((satisfiedRequired / totalRequired) * 100) : 100;

  return {
    checklist: updated,
    totalRequired,
    satisfiedRequired,
    percentComplete,
  };
}
