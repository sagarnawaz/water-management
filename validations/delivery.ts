import { z } from "zod";

import { roundMoney } from "@/lib/money";

export const deliverySchema = z
  .object({
    deliveryRecordId: z.string().min(1),
    deliveredQty: z.coerce.number().min(0, "Delivered quantity is required"),
    status: z.enum([
      "delivered",
      "partially_delivered",
      "not_delivered",
      "skipped",
      "rescheduled",
    ]),
    paymentOutcome: z.enum([
      "cash_received",
      "online_claimed",
      "credit_due",
      "partial_payment",
    ]),
    amountReceived: z.coerce.number().min(0).transform(roundMoney).optional(),
    transactionReference: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.status === "delivered" || value.status === "partially_delivered") &&
      value.deliveredQty <= 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveredQty"],
        message: "Enter delivered bottles",
      });
    }

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

    if (value.paymentOutcome === "partial_payment" && value.status === "not_delivered") {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Partial payment requires a delivered quantity",
      });
    }
  });

export type DeliveryFormValues = z.input<typeof deliverySchema>;
export type DeliveryInput = z.output<typeof deliverySchema>;
