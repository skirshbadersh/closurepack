import { getJurisdictions } from "@/lib/actions/projects";
import { CreateProjectWizard } from "@/components/projects/create-project-wizard";

export default async function NewProjectPage() {
  const jurisdictions = await getJurisdictions();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          New Closure Package
        </h1>
        <p className="text-muted-foreground">
          Set up a new UST closure project in 3 steps
        </p>
      </div>
      <CreateProjectWizard jurisdictions={jurisdictions} />
    </div>
  );
}
