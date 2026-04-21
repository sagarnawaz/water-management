import { z } from "zod";

import { isFuture, parseISO, startOfMonth } from "date-fns";

import { canActivateCustomerToday, normalizeServiceMonth } from "@/lib/customer-service";
import { paymentMethodOptions } from "@/lib/constants";

const paymentMethods = paymentMethodOptions.map((item) => item.value) as [
  string,
  ...string[],
];

export const customerSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2, "Customer name is required"),
    phone: z.string().min(8, "Phone number is required"),
    alternatePhone: z.string().optional(),
    address: z.string().min(8, "Address is required"),
    area: z.string().min(2, "Area is required"),
    dailyBottleQty: z.coerce.number().int().min(1, "Daily bottles are required"),
    pricePerBottle: z.coerce.number().min(1, "Price per bottle is required"),
    paymentMethod: z.enum(paymentMethods),
    assignedRiderId: z.string().optional(),
    billingMonth: z.string().min(1, "Select a billing month"),
    serviceStartDate: z.string().min(1, "Service start date is required"),
    serviceStatus: z.enum(["active", "inactive"]),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const monthDate = startOfMonth(parseISO(value.billingMonth));
    const serviceStartDate = parseISO(value.serviceStartDate);

    if (isFuture(monthDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["billingMonth"],
        message: "Upcoming months cannot be activated yet",
      });
    }

    if (Number.isNaN(serviceStartDate.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceStartDate"],
        message: "Service start date is invalid",
      });
      return;
    }

    if (normalizeServiceMonth(value.billingMonth) !== normalizeServiceMonth(value.serviceStartDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceStartDate"],
        message: "Start date must stay inside the selected billing month",
      });
    }

    if (!canActivateCustomerToday(value.serviceStartDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceStartDate"],
        message: "Future start dates are not allowed for this flow",
      });
    }

    if (value.serviceStatus === "active" && !value.assignedRiderId) {
      ctx.addIssue({
        code: "custom",
        path: ["assignedRiderId"],
        message: "Assign a rider before activating the customer",
      });
    }
  });

export type CustomerInput = z.infer<typeof customerSchema>;
