"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Cylinder } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TankForm } from "./tank-form";
import { createTank, updateTank, deleteTank } from "@/lib/actions/tanks";
import type { TankFormValues } from "@/lib/schemas/tank";
import type { UST } from "@/types";

interface TankListProps {
  projectId: string;
  initialTanks: UST[];
}

export function TankList({ projectId, initialTanks }: TankListProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<UST | null>(null);
  const [deletingTank, setDeletingTank] = useState<UST | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openAddDialog() {
    setEditingTank(null);
    setDialogOpen(true);
  }

  function openEditDialog(tank: UST) {
    setEditingTank(tank);
    setDialogOpen(true);
  }

  async function handleSubmit(values: TankFormValues) {
    setIsSubmitting(true);

    if (editingTank) {
      const result = await updateTank(editingTank.id, projectId, values);
      if (result.success) {
        toast.success("Tank updated");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update tank");
      }
    } else {
      const result = await createTank(projectId, values);
      if (result.success) {
        toast.success("Tank added");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to add tank");
      }
    }

    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!deletingTank) return;
    setIsSubmitting(true);

    const result = await deleteTank(deletingTank.id, projectId);
    if (result.success) {
      toast.success("Tank deleted");
      setDeletingTank(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete tank");
    }

    setIsSubmitting(false);
  }

  function formatClosureType(type: string | null) {
    if (type === "removal") return "Removal";
    if (type === "closure_in_place") return "Closure-in-Place";
    return type ?? "—";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">UST Inventory</h2>
          <p className="text-sm text-muted-foreground">
            {initialTanks.length === 0
              ? "No tanks added yet"
              : `${initialTanks.length} tank${initialTanks.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tank
        </Button>
      </div>

      {initialTanks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
          <Cylinder className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No tanks yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Add the underground storage tanks involved in this closure project.
            Tank data is used in the closure letter and report.
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Tank
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CERS Tank ID</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Contents</TableHead>
                <TableHead className="text-right">Capacity (gal)</TableHead>
                <TableHead>Closure Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTanks.map((tank) => (
                <TableRow key={tank.id}>
                  <TableCell className="font-mono text-sm">
                    {tank.cers_tank_id || "—"}
                  </TableCell>
                  <TableCell>{tank.internal_tank_label || "—"}</TableCell>
                  <TableCell>{tank.contents || "—"}</TableCell>
                  <TableCell className="text-right">
                    {tank.capacity_gallons?.toLocaleString() ?? "—"}
                  </TableCell>
                  <TableCell>
                    {tank.closure_date
                      ? new Date(tank.closure_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>{formatClosureType(tank.closure_type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(tank)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingTank(tank)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTank ? "Edit Tank" : "Add Tank"}
            </DialogTitle>
            <DialogDescription>
              {editingTank
                ? "Update the tank details below."
                : "Enter the details for the underground storage tank."}
            </DialogDescription>
          </DialogHeader>
          <TankForm
            key={editingTank?.id ?? "new"}
            initialData={editingTank ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingTank}
        onOpenChange={(open) => !open && setDeletingTank(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Tank</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {deletingTank?.internal_tank_label ||
                deletingTank?.cers_tank_id ||
                "this tank"}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingTank(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
