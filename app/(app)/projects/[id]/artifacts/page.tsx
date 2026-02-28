import { getUploadChecklist, getProjectArtifacts } from "@/lib/actions/artifacts";
import { ArtifactList } from "@/components/projects/artifact-list";
import { AlertCircle } from "lucide-react";

export default async function ArtifactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [checklistData, artifacts] = await Promise.all([
    getUploadChecklist(id),
    getProjectArtifacts(id),
  ]);

  if (!checklistData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold mb-1">
          Checklist not available
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This project needs a CUPA jurisdiction and closure type before
          artifacts can be uploaded.
        </p>
      </div>
    );
  }

  return (
    <ArtifactList
      projectId={id}
      grouped={checklistData.grouped}
      artifacts={artifacts}
    />
  );
}
