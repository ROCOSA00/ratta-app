// Lista única de mensajitos predefinidos. La usan tanto el selector (en el
// móvil) como la acción del servidor: el cliente solo manda la `key` y el
// servidor saca de aquí el emoji y el texto, así nadie puede colar un
// mensaje inventado en la notificación de su pareja.
//
// Para añadir uno nuevo basta con sumarlo a su grupo con una key única.

export type NudgeOption = { key: string; emoji: string; label: string };

export type NudgeGroup = {
  id: string;
  emoji: string;
  label: string;
  options: readonly NudgeOption[];
};

export const NUDGE_GROUPS: readonly NudgeGroup[] = [
  {
    id: "carino",
    emoji: "💞",
    label: "Cariño",
    options: [
      { key: "te_quiero", emoji: "🥰", label: "Te quiero" },
      { key: "te_echo_de_menos", emoji: "🥺", label: "Te echo de menos" },
      { key: "pienso_en_ti", emoji: "💭", label: "Pienso en ti" },
      { key: "besito", emoji: "😘", label: "Te mando un besito" },
      { key: "abrazo", emoji: "🤗", label: "Necesito un abrazo" },
      { key: "mimitos", emoji: "🥹", label: "Quiero mimitos" },
      { key: "buenos_dias", emoji: "☀️", label: "Buenos días" },
      { key: "buenas_noches", emoji: "🌙", label: "Buenas noches" },
    ],
  },
  {
    id: "planes",
    emoji: "🍿",
    label: "Planes",
    options: [
      { key: "pijamada", emoji: "🛌", label: "¿Pijamada?" },
      { key: "tengo_hambre", emoji: "🍕", label: "Tengo hambre" },
      { key: "fumamos", emoji: "🚬", label: "¿Fumamos?" },
      { key: "peli_y_manta", emoji: "🎬", label: "¿Peli y manta?" },
      { key: "te_llamo", emoji: "📞", label: "¿Te llamo?" },
      { key: "vente", emoji: "🏠", label: "Vente a casa" },
      { key: "salimos", emoji: "🍻", label: "¿Salimos?" },
      { key: "de_camino", emoji: "🏃", label: "Voy de camino" },
    ],
  },
  {
    id: "tonterias",
    emoji: "🤪",
    label: "Tonterías",
    options: [
      { key: "tengo_caca", emoji: "💩", label: "Tengo caca" },
      { key: "pedo", emoji: "💨", label: "Me he tirado un pedo que flipas" },
      { key: "tengo_sueno", emoji: "😴", label: "Tengo sueño" },
      { key: "me_aburro", emoji: "🥱", label: "Me aburro" },
      { key: "me_encuentro_mal", emoji: "🤒", label: "Me encuentro fatal" },
      { key: "hazme_caso", emoji: "👀", label: "Hazme caso" },
    ],
  },
];

const BY_KEY = new Map<string, NudgeOption>(
  NUDGE_GROUPS.flatMap((group) => group.options.map((option) => [option.key, option] as const)),
);

export function findNudge(key: string): NudgeOption | null {
  return BY_KEY.get(key) ?? null;
}
