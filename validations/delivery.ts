import { z } from "zod";

export const deliverySchema = z
  .object({
    orderId: z.string().min(1),
    deliveredQty: z.coerce.number().min(1, "Delivered quantity is required"),
    paymentOutcome: z.enum([
      "cash_received",
      "online_claimed",
      "unpaid_due",
      "partial_payment",
    ]),
    amountReceived: z.coerce.number().min(0).optional(),
    transactionReference: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.paymentOutcome === "cash_received" ||
        value.paymentOutcome === "partial_payment") &&
      (!value.amountReceived || value.amountReceived <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["amountReceived"],
        message: "Enter the received amount",
      });
    }
  });

export type DeliveryFormValues = z.input<typeof deliverySchema>;
export type DeliveryInput = z.output<typeof deliverySchema>;
