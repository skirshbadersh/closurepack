import {
  ExternalLink,
  FileText,
  Clock,
  Shield,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Project, Jurisdiction, UST, ParallelPermit } from "@/types";

interface SubmissionGuideProps {
  project: Project;
  jurisdiction: Jurisdiction;
  tanks: UST[];
  parallelPermits: ParallelPermit[];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function closureTypeLabel(type: string | null): string {
  if (type === "removal") return "Removal";
  if (type === "closure_in_place") return "Closure in Place";
  return "Unknown";
}

function retentionEndDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 36);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SubmissionGuide({
  project,
  jurisdiction,
  tanks,
  parallelPermits,
}: SubmissionGuideProps) {
  const facilityName = project.facility_name || "[Facility Name]";
  const cupaName = jurisdiction.cupa_name;
  const earliestClosureDate = tanks
    .map((t) => t.closure_date)
    .filter(Boolean)
    .sort()[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">
            CERS Submission Checklist
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Step-by-step instructions for submitting to {cupaName}. This
          information is also included in the exported ZIP as
          11_SubmissionChecklist.pdf.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1 */}
        <StepCard number={1} title="Log into CERS">
          <p>
            Go to{" "}
            <a
              href="https://cers.calepa.ca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
            >
              cers.calepa.ca.gov
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            and log in with your authorized credentials.
          </p>
        </StepCard>

        {/* Step 2 */}
        <StepCard number={2} title="Navigate to Facility">
          <p>
            Find <strong>{facilityName}</strong> and click &ldquo;Start
            Facility Submittal.&rdquo;
          </p>
        </StepCard>

        {/* Step 3 */}
        <StepCard number={3} title="Start UST Submittal">
          <p>
            Start a new UST submittal based on the most recently accepted
            submittal for this facility.
          </p>
        </StepCard>

        {/* Step 4 */}
        <StepCard number={4} title="Set Type of Action">
          <p>
            Select <strong>&ldquo;Confirmed/Updated Information&rdquo;</strong>{" "}
            as the Type of Action.
          </p>
        </StepCard>

        {/* Step 5: Tank updates */}
        <StepCard number={5} title="Update Each Tank">
          <p className="mb-2">
            For each tank below, edit the Tank Information/Monitoring Plan,
            select the closure type, and enter the closure date:
          </p>
          {tanks.length === 0 ? (
            <p className="text-amber-600 text-xs">
              No tanks entered — add tanks in the Tanks tab.
            </p>
          ) : (
            <div className="space-y-2">
              {tanks.map((tank) => (
                <div
                  key={tank.id}
                  className="rounded border bg-muted/50 p-2 text-xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <strong>
                      Tank{" "}
                      {tank.cers_tank_id ||
                        tank.internal_tank_label ||
                        "—"}
                    </strong>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-muted-foreground ml-5">
                    <span>Contents: {tank.contents || "—"}</span>
                    <span>
                      Closure Date: {formatDate(tank.closure_date)}
                    </span>
                    <span>
                      Type: {closureTypeLabel(tank.closure_type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StepCard>

        {/* Step 6 */}
        <StepCard number={6} title="Submit & Follow Up">
          <p>
            Submit the updated UST submittal in CERS and follow up with{" "}
            <strong>{cupaName}</strong> to confirm acceptance.
          </p>
        </StepCard>

        <Separator />

        {/* Step 7: Parallel Permits */}
        <StepCard
          number={7}
          title="Verify Parallel Permits"
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        >
          {parallelPermits.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No parallel permits configured for this jurisdiction.
            </p>
          ) : (
            <div className="space-y-2">
              {parallelPermits.map((permit) => (
                <div
                  key={permit.id}
                  className="rounded border bg-muted/50 p-2 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <strong>{permit.permit_type}</strong>
                    <Badge
                      variant={permit.required ? "default" : "outline"}
                      className="text-[10px] py-0"
                    >
                      {permit.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Agency: {permit.agency_name}
                  </p>
                  {permit.description && (
                    <p className="text-muted-foreground mt-1">
                      {permit.description}
                    </p>
                  )}
                  {permit.source_url && (
                    <a
                      href={permit.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 inline-flex items-center gap-1 mt-1"
                    >
                      More info
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </StepCard>

        {/* Step 8: Report Deadline */}
        <StepCard
          number={8}
          title="Report Deadline"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        >
          <p>
            Submit your closure report to <strong>{cupaName}</strong> by{" "}
            <strong>{formatDate(project.report_deadline)}</strong>.
          </p>
          {!project.report_deadline && (
            <p className="text-amber-600 text-xs mt-1">
              Deadline not computed — check CUPA rules for your jurisdiction.
            </p>
          )}
        </StepCard>

        {/* Step 9: Record Retention */}
        <StepCard number={9} title="Record Retention">
          <p>
            Maintain all analytical results, chain-of-custody forms, and
            closure documentation for at least <strong>36 months</strong>{" "}
            (until{" "}
            <strong>
              {retentionEndDate(
                earliestClosureDate ?? project.sampling_date
              )}
            </strong>
            ).
          </p>
        </StepCard>
      </CardContent>
    </Card>
  );
}

function StepCard({
  number,
  title,
  icon,
  children,
}: {
  number: number;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
