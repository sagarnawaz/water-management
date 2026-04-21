"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig, hasSupabaseEnv } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
