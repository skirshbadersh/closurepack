import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client — use in API routes only.
 * Uses the service role key which bypasses RLS.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
