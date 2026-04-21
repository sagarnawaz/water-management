import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { roleHome } from "@/lib/constants";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMockSessionUserByEmail } from "@/services/mock-data";
import type { SessionUser, UserRole } from "@/types/domain";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, phone, rider_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (profile?.role === "admin" || profile?.role === "rider") {
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
      }
    }
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("wm-role")?.value as UserRole | undefined;
  const email = cookieStore.get("wm-email")?.value;

  if (!role || !email) {
    return null;
  }

  return getMockSessionUserByEmail(email, role);
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

export async function setMockSession(user: SessionUser) {
  const cookieStore = await cookies();

  cookieStore.set("wm-role", user.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  cookieStore.set("wm-email", user.email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearMockSession() {
  const cookieStore = await cookies();
  cookieStore.delete("wm-role");
  cookieStore.delete("wm-email");
}
