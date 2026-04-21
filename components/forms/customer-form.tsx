"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveCustomerAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getMonthOptions, getServiceSummary } from "@/lib/customer-service";
import { paymentMethodOptions } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Customer, Rider } from "@/types/domain";
import { customerSchema, type CustomerInput } from "@/validations/customer";

const monthOptions = getMonthOptions();
const defaultBillingMonth =
  monthOptions.findLast((option) => !option.disabled)?.value ??
  format(new Date(), "yyyy-MM-01");
const defaultServiceStartDate = format(new Date(), "yyyy-MM-dd");

export function CustomerForm({
  customer,
  riders,
}: {
  customer?: Customer;
  riders: Rider[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          alternatePhone: customer.alternatePhone || "",
          address: customer.address,
          area: customer.area,
          dailyBottleQty: customer.dailyBottleQty,
          pricePerBottle: customer.pricePerBottle,
          paymentMethod: customer.paymentMethod,
          assignedRiderId: customer.assignedRiderId || "",
          billingMonth: customer.billingMonth,
          serviceStartDate: customer.serviceStartDate,
          serviceStatus: customer.isActive ? "active" : "inactive",
          notes: customer.notes || "",
        }
      : {
          name: "",
          phone: "",
          alternatePhone: "",
          address: "",
          area: "",
          dailyBottleQty: 1,
          pricePerBottle: 180,
          paymentMethod: "cash",
          assignedRiderId: "",
          billingMonth: defaultBillingMonth,
          serviceStartDate: defaultServiceStartDate,
          serviceStatus: "active",
          notes: "",
        },
  });

  const billingMonth = useWatch({ control, name: "billingMonth" });
  const serviceStartDate = useWatch({ control, name: "serviceStartDate" });
  const dailyBottleQty = Number(useWatch({ control, name: "dailyBottleQty" }) || 0);
  const pricePerBottle = Number(useWatch({ control, name: "pricePerBottle" }) || 0);
  const serviceStatus = useWatch({ control, name: "serviceStatus" });
  const serviceSummary = getServiceSummary({
    billingMonth,
    serviceStartDate,
    dailyBottleQty,
    pricePerBottle,
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveCustomerAction(values);
      if (!result.success) {
        setServerError(result.message ?? "Unable to save customer.");
        return;
      }
      router.push(result.redirectTo ?? "/admin/customers");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Customer name</Label>
            <Input id="name" placeholder="Ahmed Traders" {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Primary phone</Label>
            <Input id="phone" placeholder="+92 321..." {...register("phone")} />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternatePhone">Alternate phone</Label>
            <Input id="alternatePhone" placeholder="+92 333..." {...register("alternatePhone")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" placeholder="Street, block, landmark" {...register("address")} />
            {errors.address ? <p className="text-sm text-destructive">{errors.address.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <Input id="area" placeholder="Gulshan" {...register("area")} />
            {errors.area ? <p className="text-sm text-destructive">{errors.area.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyBottleQty">Daily bottles</Label>
            <Input id="dailyBottleQty" type="number" min="1" {...register("dailyBottleQty")} />
            {errors.dailyBottleQty ? (
              <p className="text-sm text-destructive">{errors.dailyBottleQty.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerBottle">Price per bottle</Label>
            <Input id="pricePerBottle" type="number" min="1" {...register("pricePerBottle")} />
            {errors.pricePerBottle ? (
              <p className="text-sm text-destructive">{errors.pricePerBottle.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Default payment method</Label>
            <Select id="paymentMethod" {...register("paymentMethod")}>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {errors.paymentMethod ? (
              <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedRiderId">Assigned rider</Label>
            <Select id="assignedRiderId" {...register("assignedRiderId")}>
              <option value="">Select rider</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.name} - {rider.vehicleNumber}
                </option>
              ))}
            </Select>
            {errors.assignedRiderId ? (
              <p className="text-sm text-destructive">{errors.assignedRiderId.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingMonth">Billing month</Label>
            <Select id="billingMonth" {...register("billingMonth")}>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </Select>
            {errors.billingMonth ? (
              <p className="text-sm text-destructive">{errors.billingMonth.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceStartDate">Start date</Label>
            <Input id="serviceStartDate" type="date" {...register("serviceStartDate")} />
            {errors.serviceStartDate ? (
              <p className="text-sm text-destructive">{errors.serviceStartDate.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceStatus">Service status</Label>
            <Select id="serviceStatus" {...register("serviceStatus")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="rounded-3xl bg-primary/8 p-4 sm:col-span-2">
            <p className="text-sm text-muted-foreground">Current month preview</p>
            {serviceSummary ? (
              <div className="mt-3 grid gap-3 text-sm text-foreground sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Month</p>
                  <p className="mt-1 font-semibold">{serviceSummary.monthLabel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining days</p>
                  <p className="mt-1 font-semibold">{serviceSummary.remainingDays}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated amount</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(serviceSummary.estimatedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service ends</p>
                  <p className="mt-1 font-semibold">{serviceSummary.serviceEndDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold capitalize">{serviceStatus}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Daily amount</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(dailyBottleQty * pricePerBottle)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Select month and start date to preview the remaining billed days.
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Delivery notes, payment reminders, or activation remarks"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Saving..." : customer ? "Update customer plan" : "Create customer plan"}
        </Button>
      </div>
    </form>
  );
}
