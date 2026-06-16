import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-Client für Client-Komponenten (Login-/Signup-Formular).
 */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
