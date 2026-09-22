import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Hasta que exista middleware (Fase 5) que refresque la sesión,
 * las escrituras de cookies desde un Server Component se ignoran: es el
 * comportamiento esperado según la documentación de @supabase/ssr.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: se ignora, la sesión se refresca en middleware.
        }
      },
    },
  });
}
