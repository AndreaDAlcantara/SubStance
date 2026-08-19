import { z } from "zod";

export const teacherFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  room: z.string().trim().optional(),
});
export type TeacherForm = z.infer<typeof teacherFormSchema>;
