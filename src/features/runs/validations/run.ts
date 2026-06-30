import { z } from "zod";

// runDate is preprocessed (not `.transform`) so the schema is IDEMPOTENT: zodResolver
// transforms the form string → Date client-side, then the server action re-validates the
// SAME object (now a Date). A `z.string().transform` rejects the Date on that second pass
// ("Invalid input") and blocked all run creation — see E2E-AUDIT 🔴 1.
export const createRunSchema = z.object({
  slot: z.enum(["morning", "night"], { error: "Slot is required" }),
  runDate: z.preprocess(
    (v) => (typeof v === "string" && v ? new Date(v) : v),
    z.date({ error: "Run date is required" }),
  ),
  driverId: z.string().nullable().optional(),
});
export type CreateRunInput = z.infer<typeof createRunSchema>;

export const editRunSchema = z.object({
  slot: z.enum(["morning", "night"]).optional(),
  runDate: z.preprocess(
    (v) => (typeof v === "string" && v ? new Date(v) : v || undefined),
    z.date().optional(),
  ),
  driverId: z.string().nullable().optional(),
});
export type EditRunInput = z.infer<typeof editRunSchema>;

export const addPickupStopSchema = z.object({
  runId: z.string().min(1, { message: "Run ID required" }),
  partnerId: z.string().min(1, { message: "Partner required" }),
  seq: z.number().int().positive({ message: "Sequence must be a positive integer" }),
  notes: z.string().optional(),
});
export type AddPickupStopInput = z.infer<typeof addPickupStopSchema>;

export const addDropStopSchema = z
  .object({
    runId: z.string().min(1, { message: "Run ID required" }),
    seq: z.number().int().positive(),
    destinationId: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.destinationId && !val.address) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a saved destination or an address.",
        path: ["address"],
      });
    }
  });
export type AddDropStopInput = z.infer<typeof addDropStopSchema>;

export const reorderSchema = z.object({
  runId: z.string().min(1),
  items: z
    .array(z.object({ id: z.string(), seq: z.number().int().positive() }))
    .min(1, { message: "At least one stop required" }),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
