import { z } from "zod";

// Step 1: Facility Info
export const facilityInfoSchema = z.object({
  facility_name: z.string().min(1, "Facility name is required"),
  facility_street: z.string().min(1, "Street address is required"),
  facility_city: z.string().min(1, "City is required"),
  facility_state: z.string().min(1, "State is required"),
  facility_zip: z
    .string()
    .min(5, "ZIP code must be at least 5 characters")
    .max(10, "ZIP code is too long"),
  facility_file_number: z.string(),
  closure_permit_number: z.string(),
});

// Step 2: Owner/Operator
export const ownerOperatorSchema = z.object({
  owner_operator_name: z.string().min(1, "Owner/Operator name is required"),
  owner_operator_street: z.string().min(1, "Street address is required"),
  owner_operator_city: z.string().min(1, "City is required"),
  owner_operator_state: z.string().min(1, "State is required"),
  owner_operator_zip: z
    .string()
    .min(5, "ZIP code must be at least 5 characters")
    .max(10, "ZIP code is too long"),
});

// Step 3: Closure Details
export const closureDetailsSchema = z.object({
  jurisdiction_id: z.string().min(1, "CUPA jurisdiction is required"),
  closure_type: z.enum(["removal", "closure_in_place"], {
    message: "Closure type is required",
  }),
  name: z.string().min(1, "Project name is required"),
});

// Combined schema for the full project creation
export const createProjectSchema = facilityInfoSchema
  .merge(ownerOperatorSchema)
  .merge(closureDetailsSchema);

export type FacilityInfoValues = z.infer<typeof facilityInfoSchema>;
export type OwnerOperatorValues = z.infer<typeof ownerOperatorSchema>;
export type ClosureDetailsValues = z.infer<typeof closureDetailsSchema>;
export type CreateProjectValues = z.infer<typeof createProjectSchema>;
