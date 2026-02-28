import { z } from "zod";

export const TANK_CONTENTS_OPTIONS = [
  "Unleaded Gasoline",
  "Premium Gasoline",
  "Diesel",
  "Waste Oil / Used Oil",
  "Heating Oil",
  "Aviation Fuel",
  "Hazardous Substance",
  "Other",
] as const;

/** Contents values that require a "specify" text field */
export const REQUIRES_SPECIFY = new Set(["Hazardous Substance", "Other"]);

export const tankBaseSchema = z.object({
  cers_tank_id: z.string(),
  internal_tank_label: z.string(),
  contents: z.string().min(1, "Tank contents are required"),
  contents_other: z.string(),
  capacity_gallons: z
    .number({ message: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .positive("Capacity must be positive"),
  closure_date: z.string().min(1, "Closure date is required"),
  closure_type: z.enum(["removal", "closure_in_place"], {
    message: "Closure type is required",
  }),
});

/** Schema with cross-field refinement for server-side validation */
export const tankSchema = tankBaseSchema.refine(
  (data) => {
    if (REQUIRES_SPECIFY.has(data.contents)) {
      return data.contents_other.trim().length > 0;
    }
    return true;
  },
  {
    message: "Please specify the substance",
    path: ["contents_other"],
  }
);

/** Form values type (matches base schema — used for useForm generic) */
export type TankFormValues = z.infer<typeof tankBaseSchema>;
