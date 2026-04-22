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
import type { Customer, DeliveryRecord, Subscription } from "@/types/domain";
import {
  deliverySchema,
  type DeliveryFormValues,
  type DeliveryInput,
} from "@/validations/delivery";

export function DeliveryCompletionForm({
  deliveryRecord,
  subscription,
  customer,
}: {
  deliveryRecord: DeliveryRecord;
  subscription?: Subscription;
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
      deliveryRecordId: deliveryRecord.id,
      deliveredQty: deliveryRecord.scheduledBottles,
      status: "delivered",
      paymentOutcome:
        subscription?.paymentMethod === "credit" ? "credit_due" : "cash_received",
      amountReceived: deliveryRecord.expectedAmount,
      transactionReference: "",
      notes: "",
    },
  });

  const paymentOutcome = useWatch({ control, name: "paymentOutcome" });
  const status = useWatch({ control, name: "status" });
  const amountReceived = Number(useWatch({ control, name: "amountReceived" }) || 0);
  const remainingDue = Math.max(deliveryRecord.expectedAmount - amountReceived, 0);

  const onSubmit = handleSubmit((values) => {
    const formData = new FormData();
    formData.set("deliveryRecordId", values.deliveryRecordId);
    formData.set("customerId", customer.id);
    formData.set("subscriptionId", deliveryRecord.subscriptionId);
    formData.set("deliveredQty", String(values.deliveredQty));
    formData.set("status", values.status);
    formData.set("paymentOutcome", values.paymentOutcome);
    formData.set("amountReceived", String(values.amountReceived ?? 0));
    formData.set("transactionReference", values.transactionReference ?? "");
    formData.set("notes", values.notes ?? "");

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
      router.push(result.redirectTo ?? `/rider/deliveries/${deliveryRecord.id}/success`);
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="status">Delivery status</Label>
            <Select id="status" {...register("status")}>
              <option value="delivered">Delivered</option>
              <option value="partially_delivered">Partially delivered</option>
              <option value="not_delivered">Not delivered</option>
              <option value="skipped">Skipped</option>
              <option value="rescheduled">Rescheduled</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveredQty">Delivered bottles</Label>
            <Input id="deliveredQty" type="number" min="0" {...register("deliveredQty")} />
            {errors.deliveredQty ? (
              <p className="text-sm text-destructive">{errors.deliveredQty.message}</p>
            ) : null}
          </div>

          <div className="rounded-3xl bg-primary/8 p-4">
            <p className="text-sm text-muted-foreground">Expected amount</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {formatCurrency(deliveryRecord.expectedAmount)}
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="paymentOutcome">Payment outcome</Label>
            <Select id="paymentOutcome" {...register("paymentOutcome")}>
              <option value="cash_received">Cash received</option>
              <option value="online_claimed">Online payment claimed</option>
              <option value="credit_due">Credit / due</option>
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

          {(paymentOutcome === "partial_payment" || paymentOutcome === "credit_due") ? (
            <div className="rounded-3xl bg-amber-500/10 p-4">
              <p className="text-sm text-amber-700">Remaining due</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {formatCurrency(
                  paymentOutcome === "credit_due" ? deliveryRecord.expectedAmount : remainingDue,
                )}
              </p>
            </div>
          ) : null}

          {(paymentOutcome === "online_claimed" ||
            paymentOutcome === "partial_payment" ||
            status === "not_delivered") ? (
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
              placeholder="Gate locked, partial stock, customer requested later time, or collection note"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Submitting..." : "Submit delivery update"}
        </Button>
      </div>
    </form>
  );
}
