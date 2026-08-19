import { z } from "zod";

export const substituteFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type SubstituteForm = z.infer<typeof substituteFormSchema>;
