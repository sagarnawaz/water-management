import { z } from "zod";

export const riderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Rider name is required"),
  phone: z.string().min(8, "Phone number is required"),
  vehicleNumber: z.string().min(2, "Vehicle number is required"),
  status: z.enum(["active", "inactive"]),
});

export type RiderInput = z.infer<typeof riderSchema>;
