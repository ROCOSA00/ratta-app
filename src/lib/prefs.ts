/**
 * Ajustes de la app (tema, tamaño de letra, animaciones…). Son de cada
 * dispositivo y viven en una cookie, para que el servidor pinte ya la
 * página con el tema elegido (sin parpadeo de claro a oscuro al abrir).
 * Este archivo lo usan tanto el servidor como el navegador.
 */

export type Theme = "system" | "light" | "dark";
export type TextSize = "normal" | "large";

/** Tarjetas de Inicio que se pueden ocultar. */
export const HOME_CARDS = [
  { id: "memory", label: "Recuerdo del día" },
  { id: "question", label: "Pregunta del día" },
  { id: "nudge", label: "Cariño (mensajitos)" },
  { id: "music", label: "Vuestra música" },
  { id: "trono", label: "El Trono" },
  { id: "pinned", label: "Nota fijada" },
] as const;

export type HomeCardId = (typeof HOME_CARDS)[number]["id"];

export type Prefs = {
  theme: Theme;
  textSize: TextSize;
  /** Quitar casi todas las animaciones. */
  reduceMotion: boolean;
  /** Pantalla de carga con el logo al abrir la app. */
  splash: boolean;
  /** Vibrar en los juegos (solo en móviles que lo permiten). */
  haptics: boolean;
  /** Tarjetas de Inicio ocultas. */
  hiddenHome: HomeCardId[];
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  textSize: "normal",
  reduceMotion: false,
  splash: true,
  haptics: true,
  hiddenHome: [],
};

export const PREFS_COOKIE = "ratta-prefs";
/** Un año: los ajustes no deberían caducar. */
export const PREFS_MAX_AGE = 60 * 60 * 24 * 365;

const HOME_IDS = new Set<string>(HOME_CARDS.map((c) => c.id));

/** Lee la cookie sin fiarse de ella: cualquier valor raro vuelve al de por defecto. */
export function parsePrefs(raw: string | undefined | null): Prefs {
  if (!raw) return { ...DEFAULT_PREFS };
  let data: unknown;
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
  if (typeof data !== "object" || data === null) return { ...DEFAULT_PREFS };
  const d = data as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    theme: d.theme === "light" || d.theme === "dark" ? d.theme : "system",
    textSize: d.textSize === "large" ? "large" : "normal",
    reduceMotion: bool(d.reduceMotion, DEFAULT_PREFS.reduceMotion),
    splash: bool(d.splash, DEFAULT_PREFS.splash),
    haptics: bool(d.haptics, DEFAULT_PREFS.haptics),
    hiddenHome: Array.isArray(d.hiddenHome)
      ? [...new Set(d.hiddenHome.filter((id): id is HomeCardId => typeof id === "string" && HOME_IDS.has(id)))]
      : [],
  };
}

export function serializePrefs(prefs: Prefs): string {
  return encodeURIComponent(JSON.stringify(prefs));
}

/** Atributos de <html> que aplican los ajustes (el CSS hace el resto). */
export function htmlAttributes(prefs: Prefs): {
  "data-theme"?: "light" | "dark";
  "data-text"?: "large";
  "data-motion"?: "reduced";
} {
  return {
    ...(prefs.theme !== "system" ? { "data-theme": prefs.theme } : {}),
    ...(prefs.textSize === "large" ? { "data-text": "large" as const } : {}),
    ...(prefs.reduceMotion ? { "data-motion": "reduced" as const } : {}),
  };
}
