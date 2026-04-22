import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { roleHome } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser, UserRole } from "@/types/domain";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, rider_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "rider") {
    return null;
  }

  let riderId = profile.rider_id ?? undefined;

  if (profile.role === "rider" && !riderId) {
    const { data: rider } = await supabase
      .from("riders")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    riderId = rider?.id;
  }

  return {
    id: profile.id,
    role: profile.role,
    name: profile.full_name ?? user.email ?? "User",
    email: user.email ?? "",
    phone: profile.phone ?? undefined,
    riderId,
  };
});

export async function requireUser(role?: UserRole) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (role && user.role !== role) {
    redirect(roleHome[user.role]);
  }

  return user;
}
