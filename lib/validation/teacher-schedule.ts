import { z } from "zod";

export const periodAssignmentRowSchema = z.object({
  periodId: z.string().min(1),
  type: z.enum(["CLASS", "PLANNING", "LUNCH"]),
  subjectLabel: z.string().trim().optional(),
});

export const teacherScheduleFormSchema = z.object({
  assignments: z.array(periodAssignmentRowSchema),
});
export type TeacherScheduleForm = z.infer<typeof teacherScheduleFormSchema>;
