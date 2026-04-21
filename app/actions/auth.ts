"use server";

import { redirect } from "next/navigation";

import { setMockSession, clearMockSession } from "@/lib/auth/session";
import { roleHome } from "@/lib/constants";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authenticateDemoUser } from "@/services/mock-data";
import { loginSchema, type LoginInput } from "@/validations/auth";

type AuthResult = {
  success: boolean;
  message?: string;
  redirectTo?: string;
};

export async function loginAction(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.identifier?.[0] ??
        parsed.error.flatten().fieldErrors.password?.[0] ??
        "Enter valid credentials.",
    };
  }

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.identifier,
      password: parsed.data.password,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: "Unable to load your account.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone, rider_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "admin" && profile.role !== "rider")) {
      return {
        success: false,
        message: "Your profile is missing a valid role.",
      };
    }

    const role = profile.role as "admin" | "rider";
    let riderId = profile.rider_id ?? undefined;

    if (role === "rider" && !riderId) {
      const { data: rider } = await supabase
        .from("riders")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      riderId = rider?.id;
    }

    await setMockSession({
      id: profile.id,
      role,
      name: profile.full_name ?? user.email ?? "User",
      email: user.email ?? parsed.data.identifier,
      phone: profile.phone ?? undefined,
      riderId,
    });

    return {
      success: true,
      redirectTo: roleHome[role],
    };
  }

  const user = authenticateDemoUser(parsed.data.identifier, parsed.data.password);

  if (!user) {
    return {
      success: false,
      message: "Use one of the demo accounts shown below the form.",
    };
  }

  await setMockSession(user);

  return {
    success: true,
    redirectTo: roleHome[user.role],
  };
}

export async function logoutAction() {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }

  await clearMockSession();
  redirect("/login");
}
