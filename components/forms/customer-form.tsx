"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveCustomerAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PAKISTAN_PHONE_PREFIX,
  getPakistanMobileLocalPart,
  sanitizePakistanMobileInput,
} from "@/lib/pakistan-phone";
import type { Customer, Rider } from "@/types/domain";
import {
  customerSchema,
  type CustomerFormValues,
  type CustomerInput,
} from "@/validations/customer";

type PhoneFieldProps = {
  id: string;
  name: string;
  label: string;
  value?: string;
  error?: string;
  helperText?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function PakistanPhoneField({
  id,
  name,
  label,
  value,
  error,
  helperText,
  inputRef,
  onChange,
  onBlur,
}: PhoneFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center gap-2 text-sm font-medium text-foreground">
          <span
            aria-hidden="true"
            className="relative flex h-4 w-6 overflow-hidden rounded-[3px] ring-1 ring-black/5"
          >
            <span className="w-1.5 bg-white" />
            <span className="relative flex-1 bg-emerald-700">
              <span className="absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white" />
              <span className="absolute right-[0.2rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-emerald-700" />
              <span className="absolute right-[0.1rem] top-[0.05rem] text-[0.45rem] leading-none text-white">
                *
              </span>
            </span>
          </span>
          <span>{PAKISTAN_PHONE_PREFIX}</span>
          <span className="h-5 w-px bg-border/80" />
        </div>
        <Input
          id={id}
          name={name}
          ref={inputRef}
          value={value ?? ""}
          onBlur={onBlur}
          onChange={(event) => onChange(sanitizePakistanMobileInput(event.target.value))}
          placeholder="3001234567"
          autoComplete="tel-national"
          inputMode="numeric"
          maxLength={16}
          className="pl-[7.25rem] tracking-[0.12em]"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {helperText ?? "Only Pakistan mobile numbers are allowed. We keep the +92 code fixed."}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function CustomerForm({
  customer,
  riders,
  areaOptions = [],
}: {
  customer?: Customer;
  riders?: Rider[];
  areaOptions?: string[];
}) {
  void riders;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues, undefined, CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          id: customer.id,
          name: customer.name,
          phone: getPakistanMobileLocalPart(customer.phone),
          alternatePhone: getPakistanMobileLocalPart(customer.alternatePhone || ""),
          area: customer.area,
          address: customer.address,
          notes: customer.notes || "",
          isActive: customer.isActive,
        }
      : {
          name: "",
          phone: "",
          alternatePhone: "",
          area: "",
          address: "",
          notes: "",
          isActive: true,
        },
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
            <Input
              id="name"
              placeholder="Ahmed Traders"
              autoComplete="name"
              maxLength={80}
              {...register("name")}
            />
            <p className="text-xs text-muted-foreground">Use up to 80 characters.</p>
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PakistanPhoneField
                id="phone"
                name={field.name}
                label="Primary phone"
                value={field.value}
                inputRef={field.ref}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
                helperText="Enter the remaining 10 mobile digits after +92. If you paste 03xx..., we fix it automatically."
              />
            )}
          />

          <Controller
            control={control}
            name="alternatePhone"
            render={({ field }) => (
              <PakistanPhoneField
                id="alternatePhone"
                name={field.name}
                label="Alternate phone"
                value={field.value}
                inputRef={field.ref}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.alternatePhone?.message}
                helperText="Optional secondary Pakistan mobile number."
              />
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <Input
              id="area"
              list="customer-area-options"
              placeholder="Gulshan"
              autoComplete="address-level2"
              maxLength={60}
              {...register("area")}
            />
            {areaOptions.length > 0 ? (
              <datalist id="customer-area-options">
                {areaOptions.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Select or type the service area first, then add the detailed address below.
            </p>
            {errors.area ? <p className="text-sm text-destructive">{errors.area.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="isActive">Customer status</Label>
            <Select id="isActive" {...register("isActive", { setValueAs: (value) => value === "true" })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Detailed address</Label>
            <Textarea
              id="address"
              placeholder="House / flat, street, block, nearby landmark"
              autoComplete="street-address"
              maxLength={220}
              {...register("address")}
            />
            <p className="text-xs text-muted-foreground">
              Include house, street, block, and a nearby landmark for the rider.
            </p>
            {errors.address ? <p className="text-sm text-destructive">{errors.address.message}</p> : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Address hints, delivery notes, or collection reminders"
              maxLength={300}
              {...register("notes")}
            />
            <p className="text-xs text-muted-foreground">Optional. Keep it under 300 characters.</p>
            {errors.notes ? <p className="text-sm text-destructive">{errors.notes.message}</p> : null}
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Saving..." : customer ? "Update customer" : "Create customer"}
        </Button>
      </div>
    </form>
  );
}
