import { z } from "zod";

export const periodRowSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Label is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
});
export type PeriodRow = z.infer<typeof periodRowSchema>;

export const bellScheduleFormSchema = z.object({
  schoolName: z.string().trim().min(1, "School name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  periods: z.array(periodRowSchema).min(1, "Add at least one period"),
});
export type BellScheduleForm = z.infer<typeof bellScheduleFormSchema>;
