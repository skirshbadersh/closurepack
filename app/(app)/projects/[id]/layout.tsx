import { notFound } from "next/navigation";
import { getProject, getProjectJurisdiction } from "@/lib/actions/projects";
import { Badge } from "@/components/ui/badge";
import { ProjectNav } from "@/components/projects/project-nav";
import { MapPin, Calendar } from "lucide-react";

function closureTypeBadge(type: string | null) {
  if (type === "removal") return { label: "Removal", variant: "default" as const };
  if (type === "closure_in_place") return { label: "Closure-in-Place", variant: "secondary" as const };
  return { label: "Not set", variant: "outline" as const };
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "draft": return "secondary" as const;
    case "in_progress": return "default" as const;
    case "ready": return "default" as const;
    case "submitted": return "outline" as const;
    case "accepted": return "default" as const;
    default: return "secondary" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "draft": return "Draft";
    case "in_progress": return "In Progress";
    case "ready": return "Ready";
    case "submitted": return "Submitted";
    case "accepted": return "Accepted";
    default: return status;
  }
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const jurisdiction = project.jurisdiction_id
    ? await getProjectJurisdiction(project.jurisdiction_id)
    : null;

  const closureInfo = closureTypeBadge(project.closure_type);
  const address = [
    project.facility_street,
    project.facility_city,
    project.facility_state,
    project.facility_zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge variant={statusBadgeVariant(project.status)}>
                {statusLabel(project.status)}
              </Badge>
              <Badge variant={closureInfo.variant}>{closureInfo.label}</Badge>
            </div>

            {project.facility_name && (
              <p className="text-lg text-muted-foreground">
                {project.facility_name}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {address}
                </span>
              )}
              {jurisdiction && (
                <span>CUPA: {jurisdiction.cupa_name}</span>
              )}
              {project.report_deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Report due: {new Date(project.report_deadline).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <ProjectNav projectId={project.id} />

      {/* Page content */}
      {children}
    </div>
  );
}
