import { z } from "zod";

export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().min(8, "Phone number is required"),
  alternatePhone: z.string().optional(),
  address: z.string().min(8, "Address is required"),
  area: z.string().min(2, "Area is required"),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
