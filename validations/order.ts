import { z } from "zod";

import { paymentMethodOptions } from "@/lib/constants";

const paymentMethods = paymentMethodOptions.map((item) => item.value) as [
  string,
  ...string[],
];

export const orderSchema = z
  .object({
    id: z.string().optional(),
    customerId: z.string().optional(),
    newCustomerName: z.string().optional(),
    newCustomerPhone: z.string().optional(),
    newCustomerAddress: z.string().optional(),
    newCustomerArea: z.string().optional(),
    bottleQty: z.coerce.number().min(1, "Bottle quantity is required"),
    pricePerBottle: z.coerce.number().min(1, "Price per bottle is required"),
    deliveryDate: z.string().min(4, "Delivery date is required"),
    notes: z.string().optional(),
    riderId: z.string().min(1, "Assign a rider"),
    expectedPaymentMethod: z.enum(paymentMethods),
  })
  .superRefine((value, ctx) => {
    if (!value.customerId) {
      if (!value.newCustomerName) {
        ctx.addIssue({
          code: "custom",
          path: ["newCustomerName"],
          message: "Select a customer or add a new one",
        });
      }
      if (!value.newCustomerPhone) {
        ctx.addIssue({
          code: "custom",
          path: ["newCustomerPhone"],
          message: "New customer phone is required",
        });
      }
      if (!value.newCustomerAddress) {
        ctx.addIssue({
          code: "custom",
          path: ["newCustomerAddress"],
          message: "New customer address is required",
        });
      }
      if (!value.newCustomerArea) {
        ctx.addIssue({
          code: "custom",
          path: ["newCustomerArea"],
          message: "New customer area is required",
        });
      }
    }
  });

export type OrderFormValues = z.input<typeof orderSchema>;
export type OrderInput = z.output<typeof orderSchema>;
