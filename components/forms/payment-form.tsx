"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveManualPaymentAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentMethodOptions } from "@/lib/constants";
import type { Customer, DeliveryRecord, Rider, Subscription } from "@/types/domain";
import {
  manualPaymentSchema,
  type ManualPaymentFormValues,
  type ManualPaymentInput,
} from "@/validations/payment";

export function PaymentForm({
  customers,
  riders,
  subscriptions,
  deliveryRecords,
}: {
  customers: Customer[];
  riders: Rider[];
  subscriptions: Subscription[];
  deliveryRecords: DeliveryRecord[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualPaymentFormValues, undefined, ManualPaymentInput>({
    resolver: zodResolver(manualPaymentSchema),
    defaultValues: {
      customerId: "",
      subscriptionId: "",
      deliveryRecordId: "",
      riderId: "",
      amount: 0,
      paymentMethod: "cash",
      transactionReference: "",
      notes: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveManualPaymentAction(values);
      if (!result.success) {
        setServerError(result.message ?? "Unable to save payment.");
        return;
      }
      router.push(result.redirectTo ?? "/admin/payments");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customerId">Customer</Label>
            <Select id="customerId" {...register("customerId")}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            {errors.customerId ? (
              <p className="text-sm text-destructive">{errors.customerId.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscriptionId">Linked subscription</Label>
            <Select id="subscriptionId" {...register("subscriptionId")}>
              <option value="">Optional</option>
              {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscription.id.slice(0, 8)} - {subscription.paymentMethod}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryRecordId">Linked delivery</Label>
            <Select id="deliveryRecordId" {...register("deliveryRecordId")}>
              <option value="">Optional</option>
              {deliveryRecords.map((deliveryRecord) => (
                <option key={deliveryRecord.id} value={deliveryRecord.id}>
                  {deliveryRecord.scheduledDate} - {deliveryRecord.scheduledBottles} bottles
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="riderId">Collected by rider</Label>
            <Select id="riderId" {...register("riderId")}>
              <option value="">Owner / later payment</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" min="0" {...register("amount")} />
            {errors.amount ? <p className="text-sm text-destructive">{errors.amount.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <Select id="paymentMethod" {...register("paymentMethod")}>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transactionReference">Transaction reference</Label>
            <Input
              id="transactionReference"
              placeholder="Optional bank/JazzCash/EasyPaisa reference"
              {...register("transactionReference")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Settlement notes" {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Saving..." : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
