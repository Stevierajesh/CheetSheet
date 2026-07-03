import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. createBrowserClient caches a singleton,
 * so this is safe to call from React components and the Zustand store alike.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
