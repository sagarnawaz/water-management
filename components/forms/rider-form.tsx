"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { saveRiderAction } from "@/app/actions/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Rider } from "@/types/domain";
import { riderSchema, type RiderInput } from "@/validations/rider";

export function RiderForm({ rider }: { rider?: Rider }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RiderInput>({
    resolver: zodResolver(riderSchema),
    defaultValues: rider
      ? {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          vehicleNumber: rider.vehicleNumber,
          status: rider.status,
        }
      : {
          name: "",
          phone: "",
          vehicleNumber: "",
          status: "active",
        },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveRiderAction(values);
      if (!result.success) {
        setServerError(result.message ?? "Unable to save rider.");
        return;
      }
      router.push(result.redirectTo ?? "/admin/riders");
      router.refresh();
    });
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Rider name</Label>
            <Input id="name" placeholder="Rafiq Ali" {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+92 311..." {...register("phone")} />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle number</Label>
            <Input id="vehicleNumber" placeholder="KHI-1882" {...register("vehicleNumber")} />
            {errors.vehicleNumber ? (
              <p className="text-sm text-destructive">{errors.vehicleNumber.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="sticky bottom-4 z-30 rounded-[1.75rem] border bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
          {isPending ? "Saving..." : rider ? "Update rider" : "Add rider"}
        </Button>
      </div>
    </form>
  );
}
