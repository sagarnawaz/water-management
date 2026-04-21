"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { markDeliveryAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import type { Customer, Order } from "@/types/domain";
import {
  deliverySchema,
  type DeliveryFormValues,
  type DeliveryInput,
} from "@/validations/delivery";

export function DeliveryCompletionForm({
  order,
  customer,
}: {
  order: Order;
  customer: Customer;
}) {
  const router = useRouter();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DeliveryFormValues, undefined, DeliveryInput>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      orderId: order.id,
      deliveredQty: order.bottleQty,
      paymentOutcome: "cash_received",
      amountReceived: order.totalAmount,
      transactionReference: "",
      notes: "",
    },
  });

  const paymentOutcome = useWatch({ control, name: "paymentOutcome" });
  const amountReceived = Number(useWatch({ control, name: "amountReceived" }) || 0);
  const remainingDue = Math.max(order.totalAmount - amountReceived, 0);

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("orderId", values.orderId);
    formData.set("customerId", customer.id);
    formData.set("deliveredQty", String(values.deliveredQty));
    formData.set("paymentOutcome", values.paymentOutcome);
    formData.set("amountReceived", String(values.amountReceived ?? 0));
    formData.set("transactionReference", values.transactionReference ?? "");
    formData.set("notes", values.notes ?? "");
    formData.set("totalAmount", String(order.totalAmount));

    if (proofFile) {
      formData.set("proof", proofFile);
    }

    setServerError(null);
    startTransition(async () => {
      const result = await markDeliveryAction(formData);
      if (!result.success) {
        setServerError(result.message ?? "Unable to record delivery.");
        return;
      }
      router.push(result.redirectTo ?? `/rider/deliveries/${order.id}/success`);
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deliveredQty">Delivered quantity</Label>
            <Input id="deliveredQty" type="number" min="1" {...register("deliveredQty")} />
            {errors.deliveredQty ? (
              <p className="text-sm text-destructive">{errors.deliveredQty.message}</p>
            ) : null}
          </div>
          <div className="rounded-3xl bg-primary/8 p-4">
            <p className="text-sm text-muted-foreground">Order amount</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="paymentOutcome">Payment outcome</Label>
            <Select id="paymentOutcome" {...register("paymentOutcome")}>
              <option value="cash_received">Cash received</option>
              <option value="online_claimed">Online payment claimed</option>
              <option value="unpaid_due">Unpaid / due</option>
              <option value="partial_payment">Partial payment</option>
            </Select>
          </div>

          {(paymentOutcome === "cash_received" || paymentOutcome === "partial_payment") ? (
            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount received</Label>
              <Input id="amountReceived" type="number" min="0" {...register("amountReceived")} />
              {errors.amountReceived ? (
                <p className="text-sm text-destructive">{errors.amountReceived.message}</p>
              ) : null}
            </div>
          ) : null}

          {paymentOutcome === "online_claimed" ? (
            <div className="space-y-2">
              <Label htmlFor="transactionReference">Transaction reference</Label>
              <Input
                id="transactionReference"
                placeholder="Optional online transfer reference"
                {...register("transactionReference")}
              />
            </div>
          ) : null}

          {paymentOutcome === "partial_payment" || paymentOutcome === "unpaid_due" ? (
            <div className="rounded-3xl bg-amber-500/10 p-4">
              <p className="text-sm text-amber-700">Remaining due</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatCurrency(
                  paymentOutcome === "unpaid_due" ? order.totalAmount : remainingDue,
                )}
              </p>
            </div>
          ) : null}

          {(paymentOutcome === "online_claimed" || paymentOutcome === "partial_payment") ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="proof">Screenshot or delivery proof</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Signature, gate guard, or collection notes"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Submitting..." : "Submit delivery"}
        </Button>
      </div>
    </form>
  );
}
