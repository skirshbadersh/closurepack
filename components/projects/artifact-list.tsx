"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArtifactUpload } from "./artifact-upload";
import { CATEGORY_LABELS, type EffectiveChecklistItem } from "@/lib/checklist/engine";
import type { ProjectArtifact } from "@/types";
import { FileUp } from "lucide-react";

interface ArtifactListProps {
  projectId: string;
  grouped: Record<string, EffectiveChecklistItem[]>;
  artifacts: ProjectArtifact[];
}

const CATEGORY_ORDER = [
  "pre_closure",
  "closure_activities",
  "sampling",
  "waste_disposal",
  "report",
  "post_closure",
];

export function ArtifactList({
  projectId,
  grouped,
  artifacts,
}: ArtifactListProps) {
  const router = useRouter();

  // Build a map of artifacts by checklist item code
  const artifactsByCode: Record<string, ProjectArtifact[]> = {};
  for (const artifact of artifacts) {
    if (!artifactsByCode[artifact.checklist_item_code]) {
      artifactsByCode[artifact.checklist_item_code] = [];
    }
    artifactsByCode[artifact.checklist_item_code].push(artifact);
  }

  // Calculate summary stats
  const allItems = Object.values(grouped).flat();
  const requiredItems = allItems.filter((i) => i.required);
  const satisfiedRequired = requiredItems.filter(
    (i) => (artifactsByCode[i.code]?.length ?? 0) > 0
  );
  const percentComplete =
    requiredItems.length > 0
      ? Math.round((satisfiedRequired.length / requiredItems.length) * 100)
      : 100;

  function handleChanged() {
    router.refresh();
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <FileUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold mb-1">No upload items</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This project&apos;s checklist has no items that require file uploads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upload Progress</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">
              {satisfiedRequired.length} of {requiredItems.length} required
              documents uploaded
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={percentComplete} className="h-2" />
        </CardContent>
      </Card>

      {/* Categories */}
      {CATEGORY_ORDER.map((category) => {
        const items = grouped[category];
        if (!items || items.length === 0) return null;

        const categoryLabel = CATEGORY_LABELS[category] ?? category;

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{categoryLabel}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {items.map((item) => (
                  <ArtifactUpload
                    key={item.code}
                    projectId={projectId}
                    item={item}
                    artifacts={artifactsByCode[item.code] ?? []}
                    onChanged={handleChanged}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
