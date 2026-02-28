import { getProject, getProjectJurisdiction, getProjectChecklist } from "@/lib/actions/projects";
import { getProjectTanks } from "@/lib/actions/tanks";
import { getParallelPermits } from "@/lib/actions/export";
import { ExportChecklist } from "@/components/projects/export-checklist";
import { SubmissionGuide } from "@/components/projects/submission-guide";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await getProject(id);
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <h2 className="text-lg font-semibold mb-1">Project not found</h2>
      </div>
    );
  }

  // Fetch all data in parallel
  const [completeness, jurisdiction, tanks, parallelPermits] = await Promise.all([
    getProjectChecklist(project),
    project.jurisdiction_id
      ? getProjectJurisdiction(project.jurisdiction_id)
      : null,
    getProjectTanks(id),
    project.jurisdiction_id
      ? getParallelPermits(project.jurisdiction_id)
      : Promise.resolve([]),
  ]);

  if (!completeness || !jurisdiction) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <h2 className="text-lg font-semibold mb-1">
          Missing project configuration
        </h2>
        <p className="text-sm text-muted-foreground">
          Set the CUPA jurisdiction and closure type in the project settings to
          enable export.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completeness + Export */}
      <ExportChecklist
        projectId={id}
        completeness={completeness}
        hasOverride={project.export_override_missing}
      />

      {/* Submission Guide */}
      <SubmissionGuide
        project={project}
        jurisdiction={jurisdiction}
        tanks={tanks}
        parallelPermits={parallelPermits}
      />
    </div>
  );
}
