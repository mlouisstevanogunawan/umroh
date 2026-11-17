"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;
let client: BrowserClient | null | undefined;

export function getSupabase(): BrowserClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient<Database>(url, key) : null;
  return client;
}
