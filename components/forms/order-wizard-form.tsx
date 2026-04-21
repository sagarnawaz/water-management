"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { saveOrderAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentMethodOptions } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Customer, Order, Rider } from "@/types/domain";
import {
  orderSchema,
  type OrderFormValues,
  type OrderInput,
} from "@/validations/order";

const stepLabels = [
  "Customer",
  "Order details",
  "Assign rider",
  "Payment expectation",
  "Review",
] as const;

const stepFields: Array<Array<keyof OrderInput>> = [
  ["customerId", "newCustomerName", "newCustomerPhone", "newCustomerAddress", "newCustomerArea"],
  ["bottleQty", "pricePerBottle", "deliveryDate", "notes"],
  ["riderId"],
  ["expectedPaymentMethod"],
  [],
];

export function OrderWizardForm({
  customers,
  riders,
  order,
}: {
  customers: Customer[];
  riders: Rider[];
  order?: Order;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<OrderFormValues, undefined, OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: order
      ? {
          id: order.id,
          customerId: order.customerId,
          bottleQty: order.bottleQty,
          pricePerBottle: order.pricePerBottle,
          deliveryDate: order.deliveryDate.slice(0, 16),
          notes: order.notes || "",
          riderId: order.riderId || "",
          expectedPaymentMethod: order.expectedPaymentMethod,
        }
      : {
          customerId: "",
          newCustomerName: "",
          newCustomerPhone: "",
          newCustomerAddress: "",
          newCustomerArea: "",
          bottleQty: 1,
          pricePerBottle: 180,
          deliveryDate: "",
          notes: "",
          riderId: "",
          expectedPaymentMethod: "cash",
        },
  });

  const customerId = useWatch({ control, name: "customerId" });
  const bottleQty = Number(useWatch({ control, name: "bottleQty" }) || 0);
  const pricePerBottle = Number(useWatch({ control, name: "pricePerBottle" }) || 0);
  const riderId = useWatch({ control, name: "riderId" });
  const expectedPaymentMethod = useWatch({
    control,
    name: "expectedPaymentMethod",
  });
  const deliveryDate = useWatch({ control, name: "deliveryDate" });
  const newCustomerName = useWatch({ control, name: "newCustomerName" });
  const totalAmount = bottleQty * pricePerBottle;

  const nextStep = async () => {
    const fields = stepFields[step];
    const isValid = await trigger(fields);
    if (!isValid) {
      return;
    }
    setStep((value) => Math.min(value + 1, stepLabels.length - 1));
  };

  const prevStep = () => setStep((value) => Math.max(value - 1, 0));

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveOrderAction(values);
      if (!result.success) {
        setServerError(result.message ?? "Unable to save order.");
        return;
      }
      router.push(result.redirectTo ?? "/admin/orders");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Create order workflow</CardTitle>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {stepLabels.map((label, index) => (
              <div
                key={label}
                className={`rounded-2xl px-3 py-2 text-center text-xs font-medium ${
                  index === step
                    ? "bg-primary text-primary-foreground"
                    : index < step
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {step === 0 ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Select existing customer</Label>
                <Select id="customerId" {...register("customerId")}>
                  <option value="">Add new customer inline</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.area}
                    </option>
                  ))}
                </Select>
              </div>

              {!customerId ? (
                <div className="grid gap-4 rounded-3xl bg-muted/60 p-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="newCustomerName">New customer name</Label>
                    <Input id="newCustomerName" {...register("newCustomerName")} />
                    {errors.newCustomerName ? (
                      <p className="text-sm text-destructive">{errors.newCustomerName.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCustomerPhone">Phone</Label>
                    <Input id="newCustomerPhone" {...register("newCustomerPhone")} />
                    {errors.newCustomerPhone ? (
                      <p className="text-sm text-destructive">{errors.newCustomerPhone.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCustomerArea">Area</Label>
                    <Input id="newCustomerArea" {...register("newCustomerArea")} />
                    {errors.newCustomerArea ? (
                      <p className="text-sm text-destructive">{errors.newCustomerArea.message}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="newCustomerAddress">Address</Label>
                    <Textarea id="newCustomerAddress" {...register("newCustomerAddress")} />
                    {errors.newCustomerAddress ? (
                      <p className="text-sm text-destructive">
                        {errors.newCustomerAddress.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bottleQty">Bottle quantity</Label>
                <Input id="bottleQty" type="number" min="1" {...register("bottleQty")} />
                {errors.bottleQty ? (
                  <p className="text-sm text-destructive">{errors.bottleQty.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerBottle">Price per bottle</Label>
                <Input
                  id="pricePerBottle"
                  type="number"
                  min="1"
                  {...register("pricePerBottle")}
                />
                {errors.pricePerBottle ? (
                  <p className="text-sm text-destructive">{errors.pricePerBottle.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery date</Label>
                <Input id="deliveryDate" type="datetime-local" {...register("deliveryDate")} />
                {errors.deliveryDate ? (
                  <p className="text-sm text-destructive">{errors.deliveryDate.message}</p>
                ) : null}
              </div>
              <div className="rounded-3xl bg-primary/8 p-4">
                <p className="text-sm text-muted-foreground">Auto total</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register("notes")} />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {riders.map((rider) => (
                <label
                  key={rider.id}
                  className="flex cursor-pointer items-start gap-3 rounded-3xl border border-border p-4"
                >
                  <input
                    type="radio"
                    value={rider.id}
                    className="mt-1"
                    {...register("riderId")}
                  />
                  <div>
                    <p className="font-medium text-foreground">{rider.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rider.phone} • {rider.vehicleNumber}
                    </p>
                  </div>
                </label>
              ))}
              {errors.riderId ? <p className="text-sm text-destructive">{errors.riderId.message}</p> : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {paymentMethodOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-3xl border border-border p-4"
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="mt-1"
                    {...register("expectedPaymentMethod")}
                  />
                  <span className="font-medium text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4 rounded-3xl bg-muted/60 p-5">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="size-5" />
                <p className="font-medium">Ready to confirm</p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {customerId
                    ? customers.find((customer) => customer.id === customerId)?.name
                    : newCustomerName}
                </p>
                <p>
                  <span className="text-muted-foreground">Qty:</span> {bottleQty}
                </p>
                <p>
                  <span className="text-muted-foreground">Delivery:</span>{" "}
                  {deliveryDate}
                </p>
                <p>
                  <span className="text-muted-foreground">Rider:</span>{" "}
                  {riders.find((rider) => rider.id === riderId)?.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Expected payment:</span>{" "}
                  {
                    paymentMethodOptions.find(
                      (option) => option.value === expectedPaymentMethod,
                    )?.label
                  }
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 flex-1 rounded-2xl"
            onClick={prevStep}
            disabled={step === 0 || isPending}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          {step < stepLabels.length - 1 ? (
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1 rounded-2xl"
              onClick={nextStep}
            >
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" className="h-12 flex-1 rounded-2xl">
              {isPending ? "Saving..." : order ? "Update order" : "Confirm order"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
