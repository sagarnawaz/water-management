"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveSubscriptionAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Customer, Rider, Subscription } from "@/types/domain";
import { paymentMethodOptions } from "@/lib/constants";
import {
  subscriptionSchema,
  type SubscriptionFormValues,
  type SubscriptionInput,
} from "@/validations/subscription";

const weekdayOptions = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function SubscriptionForm({
  customers,
  riders,
  subscription,
  customerId,
}: {
  customers: Customer[];
  riders: Rider[];
  subscription?: Subscription;
  customerId?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SubscriptionFormValues, undefined, SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: subscription
      ? {
          id: subscription.id,
          customerId: subscription.customerId,
          riderId: subscription.riderId || "",
          bottlesPerDelivery: subscription.bottlesPerDelivery,
          deliveryFrequency: subscription.deliveryFrequency,
          deliveryDays: subscription.deliveryDays,
          preferredTimeSlot: subscription.preferredTimeSlot || "",
          monthlyAmount: subscription.monthlyAmount,
          paymentMethod: subscription.paymentMethod,
          billingCycle: subscription.billingCycle,
          startDate: subscription.startDate,
          endDate: subscription.endDate || "",
          status: subscription.status,
        }
      : {
          customerId: customerId || "",
          riderId: "",
          bottlesPerDelivery: 1,
          deliveryFrequency: "daily",
          deliveryDays: [],
          preferredTimeSlot: "09:00 - 12:00",
          monthlyAmount: 0,
          paymentMethod: "cash",
          billingCycle: "monthly",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: "",
          status: "active",
        },
  });

  const deliveryFrequency = useWatch({ control, name: "deliveryFrequency" });
  const selectedDays = useWatch({ control, name: "deliveryDays" }) ?? [];

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveSubscriptionAction(values);
      if (!result.success) {
        setServerError(result.message ?? "Unable to save subscription.");
        return;
      }
      router.push(result.redirectTo ?? "/admin/subscriptions");
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
            <Label htmlFor="riderId">Assigned rider</Label>
            <Select id="riderId" {...register("riderId")}>
              <option value="">Unassigned</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bottlesPerDelivery">Bottles per delivery</Label>
            <Input id="bottlesPerDelivery" type="number" min="1" {...register("bottlesPerDelivery")} />
            {errors.bottlesPerDelivery ? (
              <p className="text-sm text-destructive">{errors.bottlesPerDelivery.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryFrequency">Delivery frequency</Label>
            <Select id="deliveryFrequency" {...register("deliveryFrequency")}>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="custom_days">Custom days</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredTimeSlot">Preferred time slot</Label>
            <Input id="preferredTimeSlot" placeholder="09:00 - 12:00" {...register("preferredTimeSlot")} />
          </div>

          {deliveryFrequency === "custom_days" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Delivery days</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {weekdayOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      value={option.value}
                      {...register("deliveryDays")}
                      defaultChecked={selectedDays.includes(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {errors.deliveryDays ? (
                <p className="text-sm text-destructive">{errors.deliveryDays.message as string}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="monthlyAmount">Monthly amount</Label>
            <Input id="monthlyAmount" type="number" min="0" {...register("monthlyAmount")} />
            {errors.monthlyAmount ? (
              <p className="text-sm text-destructive">{errors.monthlyAmount.message}</p>
            ) : null}
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
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate ? (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" type="date" {...register("endDate")} />
            {errors.endDate ? (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Subscription status</Label>
            <Select id="status" {...register("status")}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
              <option value="ended">Ended</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Saving..." : subscription ? "Update subscription" : "Create subscription"}
        </Button>
      </div>
    </form>
  );
}
