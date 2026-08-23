import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let tokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Root layout'ta Clerk mount edildikten sonra cagrilir.
 * Boylece her Supabase istegi/realtime baglantisi guncel Clerk JWT'sini kullanir.
 */
export function setClerkTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

function buildClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY .env dosyasinda tanimli olmali."
    );
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // Her istekten once guncel Clerk JWT'sini al (template: "supabase")
    accessToken: async () => (tokenGetter ? await tokenGetter() : null),
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) client = buildClient();
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  return tokenGetter();
}
