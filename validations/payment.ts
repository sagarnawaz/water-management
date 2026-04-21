import { z } from "zod";

import { paymentMethodOptions } from "@/lib/constants";

const paymentMethods = paymentMethodOptions.map((item) => item.value) as [
  string,
  ...string[],
];

export const manualPaymentSchema = z.object({
  orderId: z.string().optional(),
  customerId: z.string().min(1, "Customer is required"),
  riderId: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount is required"),
  paymentMethod: z.enum(paymentMethods),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export type ManualPaymentFormValues = z.input<typeof manualPaymentSchema>;
export type ManualPaymentInput = z.output<typeof manualPaymentSchema>;
