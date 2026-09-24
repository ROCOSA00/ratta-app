"use client";

import { htmlAttributes, parsePrefs, PREFS_COOKIE, PREFS_MAX_AGE, serializePrefs, type Prefs } from "./prefs";

export function readPrefs(): Prefs {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${PREFS_COOKIE}=`));
  return parsePrefs(match?.slice(PREFS_COOKIE.length + 1));
}

/** Guarda los ajustes y los aplica al momento, sin recargar. */
export function savePrefs(prefs: Prefs): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${PREFS_COOKIE}=${serializePrefs(prefs)}; Path=/; Max-Age=${PREFS_MAX_AGE}; SameSite=Lax${secure}`;
  const root = document.documentElement;
  const attrs = htmlAttributes(prefs);
  for (const name of ["data-theme", "data-text", "data-motion"] as const) {
    const value = attrs[name];
    if (value) root.setAttribute(name, value);
    else root.removeAttribute(name);
  }
}

/** Vibra (en los juegos) si el móvil lo permite y no lo has desactivado. */
export function vibrate(ms: number): void {
  try {
    if (readPrefs().haptics) navigator.vibrate?.(ms);
  } catch {
    // Sin vibración o sin cookies: no pasa nada.
  }
}
