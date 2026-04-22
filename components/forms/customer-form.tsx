"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveCustomerAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, Rider } from "@/types/domain";
import { customerSchema, type CustomerInput } from "@/validations/customer";

export function CustomerForm({
  customer,
  riders,
}: {
  customer?: Customer;
  riders?: Rider[];
}) {
  void riders;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
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
          notes: customer.notes || "",
          isActive: customer.isActive,
        }
      : {
          name: "",
          phone: "",
          alternatePhone: "",
          address: "",
          area: "",
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
            <Label htmlFor="isActive">Customer status</Label>
            <Select id="isActive" {...register("isActive", { setValueAs: (value) => value === "true" })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Address hints, delivery notes, or collection reminders"
              {...register("notes")}
            />
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
