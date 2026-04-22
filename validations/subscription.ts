import { z } from "zod";

import { paymentMethodOptions } from "@/lib/constants";

const paymentMethods = paymentMethodOptions.map((item) => item.value) as [
  string,
  ...string[],
];

export const subscriptionSchema = z
  .object({
    id: z.string().optional(),
    customerId: z.string().min(1, "Customer is required"),
    riderId: z.string().optional(),
    bottlesPerDelivery: z.coerce.number().min(1, "Bottles per delivery is required"),
    deliveryFrequency: z.enum(["daily", "weekdays", "custom_days"]),
    deliveryDays: z.array(z.coerce.number().min(0).max(6)).default([]),
    preferredTimeSlot: z.string().optional(),
    monthlyAmount: z.coerce.number().min(0, "Monthly amount is required"),
    paymentMethod: z.enum(paymentMethods),
    billingCycle: z.enum(["monthly"]).default("monthly"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    status: z.enum(["active", "inactive", "paused", "ended"]).default("active"),
  })
  .superRefine((value, ctx) => {
    if (value.deliveryFrequency === "custom_days" && value.deliveryDays.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryDays"],
        message: "Select at least one delivery day",
      });
    }

    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before the start date",
      });
    }
  });

export type SubscriptionFormValues = z.input<typeof subscriptionSchema>;
export type SubscriptionInput = z.output<typeof subscriptionSchema>;
