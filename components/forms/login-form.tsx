"use client";

import { useActionState } from "react";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const initialState: AuthFormState = {};
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or phone</Label>
        <Input
          id="identifier"
          name="identifier"
          placeholder="Enter your email or phone"
          autoComplete="username"
          required
          minLength={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="********"
          autoComplete="current-password"
          required
          minLength={6}
        />
      </div>
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" size="lg" className="h-12 w-full rounded-2xl" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
