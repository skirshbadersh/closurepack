import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus } from "lucide-react";
import type { Project } from "@/types";

function statusBadgeVariant(status: string) {
  switch (status) {
    case "draft":
      return "secondary" as const;
    case "in_progress":
      return "default" as const;
    case "ready":
      return "default" as const;
    case "submitted":
      return "outline" as const;
    case "accepted":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "in_progress":
      return "In Progress";
    case "ready":
      return "Ready";
    case "submitted":
      return "Submitted";
    case "accepted":
      return "Accepted";
    default:
      return status;
  }
}

export default async function ProjectsPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const supabase = createAdminClient();

  // Get user's tenant_id
  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("clerk_id", clerkUser.id)
    .single();

  // Fetch projects for this tenant
  const { data: projects } = user
    ? await supabase
        .from("projects")
        .select("*")
        .eq("tenant_id", user.tenant_id)
        .order("updated_at", { ascending: false })
    : { data: [] as Project[] };

  const hasProjects = projects && projects.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your UST closure packages
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {hasProjects ? (
        <div className="grid gap-4">
          {projects!.map((project: Project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{project.name}</h3>
                    <Badge variant={statusBadgeVariant(project.status)}>
                      {statusLabel(project.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {project.facility_name || "No facility set"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold mb-1">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Create your first UST closure package to get started. You&apos;ll be
            guided through facility info, tank inventory, and document assembly.
          </p>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
