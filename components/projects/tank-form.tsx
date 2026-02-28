"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  tankBaseSchema,
  type TankFormValues,
  TANK_CONTENTS_OPTIONS,
  REQUIRES_SPECIFY,
} from "@/lib/schemas/tank";
import type { UST } from "@/types";

interface TankFormProps {
  /** If provided, form is in edit mode with pre-populated values */
  initialData?: UST;
  onSubmit: (values: TankFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Parse stored contents back to form values.
 * e.g., "Hazardous Substance: Benzene" → { contents: "Hazardous Substance", contents_other: "Benzene" }
 */
function parseContents(stored: string | null): {
  contents: string;
  contents_other: string;
} {
  if (!stored) return { contents: "", contents_other: "" };

  for (const option of TANK_CONTENTS_OPTIONS) {
    if (REQUIRES_SPECIFY.has(option) && stored.startsWith(`${option}: `)) {
      return {
        contents: option,
        contents_other: stored.slice(option.length + 2),
      };
    }
  }

  // Check if it's a known option
  if (TANK_CONTENTS_OPTIONS.includes(stored as (typeof TANK_CONTENTS_OPTIONS)[number])) {
    return { contents: stored, contents_other: "" };
  }

  // Unknown value — treat as Other
  return { contents: "Other", contents_other: stored };
}

export function TankForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TankFormProps) {
  const parsed = initialData ? parseContents(initialData.contents) : null;

  const form = useForm<TankFormValues>({
    resolver: zodResolver(tankBaseSchema),
    defaultValues: {
      cers_tank_id: initialData?.cers_tank_id ?? "",
      internal_tank_label: initialData?.internal_tank_label ?? "",
      contents: parsed?.contents ?? "",
      contents_other: parsed?.contents_other ?? "",
      capacity_gallons: initialData?.capacity_gallons ?? (undefined as unknown as number),
      closure_date: initialData?.closure_date ?? "",
      closure_type: initialData?.closure_type === "removal" || initialData?.closure_type === "closure_in_place"
        ? initialData.closure_type
        : undefined,
    },
  });

  const contentsValue = form.watch("contents");
  const showSpecify = REQUIRES_SPECIFY.has(contentsValue);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cers_tank_id">CERS Tank ID</Label>
          <Input
            id="cers_tank_id"
            placeholder="Optional"
            {...form.register("cers_tank_id")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="internal_tank_label">Internal Label</Label>
          <Input
            id="internal_tank_label"
            placeholder='e.g., "Tank 1" or "UST-A"'
            {...form.register("internal_tank_label")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Contents *</Label>
        <Select
          value={contentsValue}
          onValueChange={(value) =>
            form.setValue("contents", value, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select tank contents" />
          </SelectTrigger>
          <SelectContent>
            {TANK_CONTENTS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.contents && (
          <p className="text-sm text-destructive">
            {form.formState.errors.contents.message}
          </p>
        )}
      </div>

      {showSpecify && (
        <div className="space-y-2">
          <Label htmlFor="contents_other">Specify Substance *</Label>
          <Input
            id="contents_other"
            placeholder="Describe the substance"
            {...form.register("contents_other")}
          />
          {form.formState.errors.contents_other && (
            <p className="text-sm text-destructive">
              {form.formState.errors.contents_other.message}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity_gallons">Capacity (gallons) *</Label>
          <Input
            id="capacity_gallons"
            type="number"
            placeholder="e.g., 10000"
            {...form.register("capacity_gallons", { valueAsNumber: true })}
          />
          {form.formState.errors.capacity_gallons && (
            <p className="text-sm text-destructive">
              {form.formState.errors.capacity_gallons.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="closure_date">Closure Date *</Label>
          <Input
            id="closure_date"
            type="date"
            {...form.register("closure_date")}
          />
          {form.formState.errors.closure_date && (
            <p className="text-sm text-destructive">
              {form.formState.errors.closure_date.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Closure Type *</Label>
        <RadioGroup
          value={form.watch("closure_type")}
          onValueChange={(v) =>
            form.setValue("closure_type", v as "removal" | "closure_in_place", {
              shouldValidate: true,
            })
          }
          className="flex gap-4"
        >
          <Label
            htmlFor="tank_removal"
            className="flex items-center gap-2 cursor-pointer"
          >
            <RadioGroupItem value="removal" id="tank_removal" />
            Removal
          </Label>
          <Label
            htmlFor="tank_cip"
            className="flex items-center gap-2 cursor-pointer"
          >
            <RadioGroupItem value="closure_in_place" id="tank_cip" />
            Closure-in-Place
          </Label>
        </RadioGroup>
        {form.formState.errors.closure_type && (
          <p className="text-sm text-destructive">
            {form.formState.errors.closure_type.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? initialData
              ? "Saving..."
              : "Adding..."
            : initialData
              ? "Save Changes"
              : "Add Tank"}
        </Button>
      </div>
    </form>
  );
}
