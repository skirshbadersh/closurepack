import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus } from "lucide-react";
import type { Project } from "@/types";

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
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.facility_name || "No facility set"} &middot;{" "}
                    {project.status.replace("_", " ")}
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
            Create your first UST closure package to get started. You'll be
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
