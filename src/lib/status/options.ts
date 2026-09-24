// Estados de ánimo del perfil. Como con los mensajitos, el cliente solo
// manda la key y el servidor pone el emoji y el texto.

export type StatusOption = { key: string; emoji: string; label: string };

export const STATUS_OPTIONS: readonly StatusOption[] = [
  { key: "enamorado", emoji: "😍", label: "Enamorado/a" },
  { key: "feliz", emoji: "😄", label: "Feliz" },
  { key: "mimoso", emoji: "🥰", label: "Mimoso/a" },
  { key: "desatendido", emoji: "🥺", label: "Desatendido/a" },
  { key: "enfadado", emoji: "😠", label: "Enfadado/a" },
  { key: "picado", emoji: "😤", label: "Picado/a" },
  { key: "cagon", emoji: "💩", label: "Cagón/a" },
  { key: "hambre", emoji: "🍕", label: "Con hambre" },
  { key: "sueno", emoji: "😴", label: "Con sueño" },
  { key: "aburrido", emoji: "🥱", label: "Aburrido/a" },
  { key: "estresado", emoji: "🤯", label: "Estresado/a" },
  { key: "malito", emoji: "🤒", label: "Malito/a" },
  { key: "trabajando", emoji: "💼", label: "Trabajando" },
  { key: "fiesta", emoji: "🎉", label: "De fiesta" },
];

const BY_KEY = new Map(STATUS_OPTIONS.map((o) => [o.key, o] as const));

export function findStatus(key: string | null | undefined): StatusOption | null {
  return key ? (BY_KEY.get(key) ?? null) : null;
}
