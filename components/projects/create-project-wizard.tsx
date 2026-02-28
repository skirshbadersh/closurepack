"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  facilityInfoSchema,
  ownerOperatorSchema,
  closureDetailsSchema,
  type FacilityInfoValues,
  type OwnerOperatorValues,
  type ClosureDetailsValues,
  type CreateProjectValues,
} from "@/lib/schemas/project";
import { createProject } from "@/lib/actions/projects";
import type { Jurisdiction } from "@/types";

interface CreateProjectWizardProps {
  jurisdictions: Jurisdiction[];
}

const STEPS = ["Facility Info", "Owner/Operator", "Closure Details"] as const;

export function CreateProjectWizard({
  jurisdictions,
}: CreateProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Accumulated data from completed steps
  const [facilityData, setFacilityData] = useState<FacilityInfoValues | null>(
    null
  );
  const [ownerData, setOwnerData] = useState<OwnerOperatorValues | null>(null);

  // Step 1 form
  const facilityForm = useForm<FacilityInfoValues>({
    resolver: zodResolver(facilityInfoSchema),
    defaultValues: {
      facility_name: "",
      facility_street: "",
      facility_city: "",
      facility_state: "CA",
      facility_zip: "",
      facility_file_number: "",
      closure_permit_number: "",
    },
  });

  // Step 2 form
  const ownerForm = useForm<OwnerOperatorValues>({
    resolver: zodResolver(ownerOperatorSchema),
    defaultValues: {
      owner_operator_name: "",
      owner_operator_street: "",
      owner_operator_city: "",
      owner_operator_state: "CA",
      owner_operator_zip: "",
    },
  });

  // Step 3 form
  const closureForm = useForm<ClosureDetailsValues>({
    resolver: zodResolver(closureDetailsSchema),
    defaultValues: {
      jurisdiction_id: "",
      closure_type: undefined,
      name: "",
    },
  });

  function handleFacilityNext(data: FacilityInfoValues) {
    setFacilityData(data);
    setStep(1);
  }

  function handleOwnerNext(data: OwnerOperatorValues) {
    setOwnerData(data);
    // Auto-suggest project name from facility + closure type
    const currentName = closureForm.getValues("name");
    if (!currentName && facilityData?.facility_name) {
      closureForm.setValue("name", `${facilityData.facility_name} — Closure`);
    }
    setStep(2);
  }

  async function handleFinalSubmit(data: ClosureDetailsValues) {
    if (!facilityData || !ownerData) return;

    setIsSubmitting(true);

    const fullValues: CreateProjectValues = {
      ...facilityData,
      ...ownerData,
      ...data,
    };

    const result = await createProject(fullValues);

    if (result.success && result.data) {
      toast.success("Project created");
      router.push(`/projects/${result.data.id}`);
    } else {
      toast.error(result.error ?? "Failed to create project");
      setIsSubmitting(false);
    }
  }

  // Update project name suggestion when closure type changes
  function handleClosureTypeChange(value: "removal" | "closure_in_place") {
    closureForm.setValue("closure_type", value);
    const currentName = closureForm.getValues("name");
    const facilityName = facilityData?.facility_name ?? "";
    // Only auto-update if name looks like our auto-suggestion
    if (
      !currentName ||
      currentName.endsWith("— Closure") ||
      currentName.endsWith("— Removal") ||
      currentName.endsWith("— CIP")
    ) {
      const suffix = value === "removal" ? "Removal" : "CIP";
      closureForm.setValue("name", `${facilityName} — ${suffix}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-border mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Facility Info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Facility Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={facilityForm.handleSubmit(handleFacilityNext)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="facility_name">Facility Name *</Label>
                <Input
                  id="facility_name"
                  placeholder="e.g., Shell Station #1234"
                  {...facilityForm.register("facility_name")}
                />
                {facilityForm.formState.errors.facility_name && (
                  <p className="text-sm text-destructive">
                    {facilityForm.formState.errors.facility_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility_street">Street Address *</Label>
                <Input
                  id="facility_street"
                  placeholder="123 Main St"
                  {...facilityForm.register("facility_street")}
                />
                {facilityForm.formState.errors.facility_street && (
                  <p className="text-sm text-destructive">
                    {facilityForm.formState.errors.facility_street.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="facility_city">City *</Label>
                  <Input
                    id="facility_city"
                    placeholder="Los Angeles"
                    {...facilityForm.register("facility_city")}
                  />
                  {facilityForm.formState.errors.facility_city && (
                    <p className="text-sm text-destructive">
                      {facilityForm.formState.errors.facility_city.message}
                    </p>
                  )}
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="facility_state">State *</Label>
                  <Input
                    id="facility_state"
                    {...facilityForm.register("facility_state")}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="facility_zip">ZIP Code *</Label>
                  <Input
                    id="facility_zip"
                    placeholder="90001"
                    {...facilityForm.register("facility_zip")}
                  />
                  {facilityForm.formState.errors.facility_zip && (
                    <p className="text-sm text-destructive">
                      {facilityForm.formState.errors.facility_zip.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facility_file_number">
                    Facility File Number
                  </Label>
                  <Input
                    id="facility_file_number"
                    placeholder="Optional"
                    {...facilityForm.register("facility_file_number")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closure_permit_number">
                    Closure Permit Number
                  </Label>
                  <Input
                    id="closure_permit_number"
                    placeholder="Optional"
                    {...facilityForm.register("closure_permit_number")}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit">Next: Owner/Operator</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Owner/Operator */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Owner / Operator</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={ownerForm.handleSubmit(handleOwnerNext)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="owner_operator_name">
                  Owner/Operator Name *
                </Label>
                <Input
                  id="owner_operator_name"
                  placeholder="e.g., ABC Oil Company LLC"
                  {...ownerForm.register("owner_operator_name")}
                />
                {ownerForm.formState.errors.owner_operator_name && (
                  <p className="text-sm text-destructive">
                    {ownerForm.formState.errors.owner_operator_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_operator_street">
                  Mailing Address *
                </Label>
                <Input
                  id="owner_operator_street"
                  placeholder="456 Corporate Blvd, Suite 200"
                  {...ownerForm.register("owner_operator_street")}
                />
                {ownerForm.formState.errors.owner_operator_street && (
                  <p className="text-sm text-destructive">
                    {ownerForm.formState.errors.owner_operator_street.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="owner_operator_city">City *</Label>
                  <Input
                    id="owner_operator_city"
                    placeholder="Los Angeles"
                    {...ownerForm.register("owner_operator_city")}
                  />
                  {ownerForm.formState.errors.owner_operator_city && (
                    <p className="text-sm text-destructive">
                      {ownerForm.formState.errors.owner_operator_city.message}
                    </p>
                  )}
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="owner_operator_state">State *</Label>
                  <Input
                    id="owner_operator_state"
                    {...ownerForm.register("owner_operator_state")}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="owner_operator_zip">ZIP Code *</Label>
                  <Input
                    id="owner_operator_zip"
                    placeholder="90001"
                    {...ownerForm.register("owner_operator_zip")}
                  />
                  {ownerForm.formState.errors.owner_operator_zip && (
                    <p className="text-sm text-destructive">
                      {ownerForm.formState.errors.owner_operator_zip.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
                <Button type="submit">Next: Closure Details</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Closure Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Closure Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={closureForm.handleSubmit(handleFinalSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>CUPA Jurisdiction *</Label>
                <Select
                  value={closureForm.watch("jurisdiction_id")}
                  onValueChange={(value) =>
                    closureForm.setValue("jurisdiction_id", value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a CUPA jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    {jurisdictions.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.cupa_name}
                        {j.cupa_short_name && ` (${j.cupa_short_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {closureForm.formState.errors.jurisdiction_id && (
                  <p className="text-sm text-destructive">
                    {closureForm.formState.errors.jurisdiction_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Closure Type *</Label>
                <RadioGroup
                  value={closureForm.watch("closure_type")}
                  onValueChange={(v) =>
                    handleClosureTypeChange(
                      v as "removal" | "closure_in_place"
                    )
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="removal"
                    className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors [&:has([data-state=checked])]:border-primary"
                  >
                    <RadioGroupItem value="removal" id="removal" />
                    <div>
                      <div className="font-medium">Removal</div>
                      <div className="text-sm text-muted-foreground">
                        Tank excavated and removed
                      </div>
                    </div>
                  </Label>
                  <Label
                    htmlFor="closure_in_place"
                    className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors [&:has([data-state=checked])]:border-primary"
                  >
                    <RadioGroupItem
                      value="closure_in_place"
                      id="closure_in_place"
                    />
                    <div>
                      <div className="font-medium">Closure-in-Place</div>
                      <div className="text-sm text-muted-foreground">
                        Tank filled with inert material
                      </div>
                    </div>
                  </Label>
                </RadioGroup>
                {closureForm.formState.errors.closure_type && (
                  <p className="text-sm text-destructive">
                    {closureForm.formState.errors.closure_type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Shell Station #1234 — Removal"
                  {...closureForm.register("name")}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-suggested from facility name + closure type. Edit as
                  needed.
                </p>
                {closureForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {closureForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
