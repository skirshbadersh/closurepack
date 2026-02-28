"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setExportOverride } from "@/lib/actions/export";
import {
  groupByCategory,
  CATEGORY_LABELS,
  type EffectiveChecklistItem,
} from "@/lib/checklist/engine";
import type { CompletenessResult } from "@/lib/checklist/completeness";

interface ExportChecklistProps {
  projectId: string;
  completeness: CompletenessResult;
  hasOverride: boolean;
}

export function ExportChecklist({
  projectId,
  completeness,
  hasOverride: initialHasOverride,
}: ExportChecklistProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [hasOverride, setHasOverride] = useState(initialHasOverride);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);

  const { checklist, totalRequired, satisfiedRequired, percentComplete } =
    completeness;
  const missingCount = totalRequired - satisfiedRequired;
  const isComplete = missingCount === 0;
  const canExport = isComplete || hasOverride;

  const grouped = groupByCategory(checklist);
  const missingItems = checklist.filter((i) => i.required && !i.satisfied);

  async function handleExportOverride() {
    setIsOverriding(true);
    try {
      const result = await setExportOverride(projectId);
      if (result.success) {
        setHasOverride(true);
        setOverrideDialogOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to set override:", err);
    } finally {
      setIsOverriding(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Export failed");
      }

      // Download the ZIP
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "Closure_Package.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Refresh to show updated status
      router.refresh();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Package Completeness</CardTitle>
            <Badge variant={isComplete ? "default" : "secondary"}>
              {satisfiedRequired} / {totalRequired} required
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percentComplete} className="h-2" />

          {/* Missing items warning */}
          {!isComplete && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {missingCount} required item{missingCount !== 1 ? "s" : ""}{" "}
                  missing
                </span>
              </div>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 ml-6">
                {missingItems.map((item) => (
                  <li key={item.code}>
                    {item.code}: {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={!canExport || isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export ZIP
            </Button>

            {!isComplete && !hasOverride && (
              <Dialog
                open={overrideDialogOpen}
                onOpenChange={setOverrideDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Export Anyway
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export with missing items?</DialogTitle>
                    <DialogDescription>
                      {missingCount} required checklist item
                      {missingCount !== 1 ? "s are" : " is"} not yet satisfied.
                      The exported package may be incomplete and could be
                      rejected by the CUPA.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border p-3 bg-muted/50 max-h-40 overflow-y-auto">
                    <ul className="text-xs space-y-1">
                      {missingItems.map((item) => (
                        <li key={item.code} className="flex items-center gap-2">
                          <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                          <span>
                            {item.code}: {item.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setOverrideDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleExportOverride}
                      disabled={isOverriding}
                    >
                      {isOverriding ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Override &amp; Allow Export
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {hasOverride && !isComplete && (
              <Badge
                variant="outline"
                className="self-center text-amber-600 border-amber-300"
              >
                Override active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Checklist Items</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(grouped).map(([category, items], idx) => (
            <div key={category}>
              {idx > 0 && <Separator className="my-3" />}
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {CATEGORY_LABELS[category] || category}
              </h4>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <ChecklistRow key={item.code} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistRow({ item }: { item: EffectiveChecklistItem }) {
  const Icon = item.satisfied ? CheckCircle : XCircle;
  const iconColor = item.satisfied
    ? "text-green-500"
    : item.required
      ? "text-red-400"
      : "text-gray-300";

  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground mr-1.5">
          {item.code}
        </span>
        <span>{item.title}</span>
        {!item.required && (
          <Badge variant="outline" className="ml-1.5 text-[10px] py-0">
            Optional
          </Badge>
        )}
        {item.isCupaSpecific && (
          <Badge variant="secondary" className="ml-1.5 text-[10px] py-0">
            CUPA
          </Badge>
        )}
      </div>
    </li>
  );
}
