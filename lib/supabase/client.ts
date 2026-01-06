import { createBrowserClient } from "@supabase/ssr";

// Database types can be generated from Supabase CLI: npx supabase gen types typescript
// For now, we'll use a generic type that allows all table operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any;

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
