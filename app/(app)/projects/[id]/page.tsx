import { notFound } from "next/navigation";
import { getProject, getProjectChecklist } from "@/lib/actions/projects";
import { CATEGORY_LABELS, groupByCategory } from "@/lib/checklist/engine";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  AlertCircle,
} from "lucide-react";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const completeness = await getProjectChecklist(project);

  if (!completeness) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold mb-1">
          Checklist not available
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This project needs a CUPA jurisdiction and closure type to generate
          the checklist. Please update the project settings.
        </p>
      </div>
    );
  }

  const { checklist, totalRequired, satisfiedRequired, percentComplete } =
    completeness;
  const grouped = groupByCategory(checklist);

  // Ordered category keys
  const categoryOrder = [
    "pre_closure",
    "closure_activities",
    "sampling",
    "waste_disposal",
    "report",
    "post_closure",
  ];

  return (
    <div className="space-y-6">
      {/* Completeness Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Package Completeness</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">
              {satisfiedRequired} of {totalRequired} required items
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={percentComplete} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {percentComplete === 100
              ? "All required items are satisfied. Your package is ready for export."
              : `${percentComplete}% complete — upload artifacts and enter data to satisfy remaining items.`}
          </p>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {categoryOrder.map((category) => {
        const items = grouped[category];
        if (!items || items.length === 0) return null;

        const categoryLabel =
          CATEGORY_LABELS[category] ?? category;
        const requiredInCategory = items.filter((i) => i.required);
        const satisfiedInCategory = requiredInCategory.filter(
          (i) => i.satisfied
        );

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{categoryLabel}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {satisfiedInCategory.length}/{requiredInCategory.length}{" "}
                  required completed
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {items.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {/* Status icon */}
                    <div className="mt-0.5">
                      {item.satisfied ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : item.required ? (
                        <Circle className="h-5 w-5 text-muted-foreground/40" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/20" />
                      )}
                    </div>

                    {/* Item content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            item.satisfied
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {item.title}
                        </span>

                        {/* Badges */}
                        {!item.required && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Optional
                          </Badge>
                        )}
                        {item.isCupaSpecific && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            CUPA
                          </Badge>
                        )}
                        {item.artifactType === "generated_doc" && (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}

                      {item.conditional && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Condition: {item.conditional}
                        </p>
                      )}
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-2">
                      {item.formUrl && (
                        <a
                          href={item.formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          Form
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline flex items-center gap-0.5"
                        >
                          Source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
