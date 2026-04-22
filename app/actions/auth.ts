"use server";

import { redirect } from "next/navigation";

import { roleHome } from "@/lib/constants";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/validations/auth";

export type AuthFormState = {
  message?: string;
};

function isLikelyEmail(value: string) {
  return value.includes("@");
}

async function resolveSupabaseLoginIdentifier(identifier: string) {
  if (isLikelyEmail(identifier)) {
    return identifier;
  }

  const admin = createServiceRoleSupabaseClient();

  if (!admin) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("auth_user_id")
    .eq("phone", identifier)
    .maybeSingle();

  if (!profile?.auth_user_id) {
    return null;
  }

  const { data, error } = await admin.auth.admin.getUserById(profile.auth_user_id);

  if (error || !data.user?.email) {
    return null;
  }

  return data.user.email;
}

export async function loginAction(
  _previousState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const input = {
    identifier: String(formData.get("identifier") ?? ""),
    password: String(formData.get("password") ?? ""),
  } satisfies LoginInput;
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message:
        parsed.error.flatten().fieldErrors.identifier?.[0] ??
        parsed.error.flatten().fieldErrors.password?.[0] ??
        "Enter valid credentials.",
    };
  }

  const loginIdentifier = await resolveSupabaseLoginIdentifier(parsed.data.identifier);

  if (!loginIdentifier) {
    return {
      message: isLikelyEmail(parsed.data.identifier)
        ? "Unable to find your account."
        : "Use your account email to sign in. Phone lookup is not available for this setup yet.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginIdentifier,
    password: parsed.data.password,
  });

  if (error) {
    return {
      message: error.message,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "Unable to load your account.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "rider")) {
    return {
      message: "Your profile is missing a valid role.",
    };
  }

  redirect(roleHome[profile.role]);
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
