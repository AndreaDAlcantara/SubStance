import { z } from "zod";

export const variantPeriodTimeSchema = z.object({
  periodSlotId: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
});

export const bellScheduleVariantFormSchema = z.object({
  times: z.array(variantPeriodTimeSchema).min(1),
});
export type BellScheduleVariantForm = z.infer<typeof bellScheduleVariantFormSchema>;
