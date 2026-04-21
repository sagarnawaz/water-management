"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (!result.success) {
        setServerError(result.message ?? "Unable to sign in.");
        return;
      }
      router.push(result.redirectTo ?? "/");
      router.refresh();
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or phone</Label>
        <Input
          id="identifier"
          placeholder="Enter your email or phone"
          autoComplete="username"
          {...register("identifier")}
        />
        {errors.identifier ? (
          <p className="text-sm text-destructive">{errors.identifier.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <Button type="submit" size="lg" className="h-12 w-full rounded-2xl">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
