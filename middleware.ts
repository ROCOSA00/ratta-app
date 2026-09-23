import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // No usar getSession(): no revalida el token contra Supabase, getUser() sí.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginRoute) {
    const inicioUrl = request.nextUrl.clone();
    inicioUrl.pathname = "/inicio";
    return NextResponse.redirect(inicioUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // sw.js y manifest.json son públicos a propósito: el navegador los pide
    // sin sesión (instalar la app, recibir notificaciones) y no contienen datos.
    // /api/momento lo llama el despertador de Supabase, sin sesión: se protege
    // con su propia clave (ver src/app/api/momento/route.ts).
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js$|manifest\\.json$|api/momento$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
