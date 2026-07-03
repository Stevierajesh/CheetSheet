import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS. Server-only: importing this from a
 * client component is a build error ('server-only'), and the secret key is
 * not NEXT_PUBLIC so it never reaches the browser.
 *
 * Only use after verifying the requester's admin claim.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
