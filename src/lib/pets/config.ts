export const PET_BUCKET = "pets";
export const PET_URL_SECONDS = 60 * 60;

export const PET_EVENT_KINDS = [
  { id: "vacuna", emoji: "💉", label: "Vacuna" },
  { id: "desparasitacion", emoji: "🪱", label: "Desparasitación" },
  { id: "veterinario", emoji: "🩺", label: "Veterinario" },
  { id: "primera_vez", emoji: "⭐", label: "Primera vez" },
  { id: "nota", emoji: "📝", label: "Nota" },
] as const;

export type PetEventKind = (typeof PET_EVENT_KINDS)[number]["id"];
export const PET_EVENT_KIND_IDS = PET_EVENT_KINDS.map((k) => k.id) as [PetEventKind, ...PetEventKind[]];

export function findKind(id: string) {
  return PET_EVENT_KINDS.find((k) => k.id === id) ?? PET_EVENT_KINDS[PET_EVENT_KINDS.length - 1]!;
}

/** "850 g" o "1,25 kg". */
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(grams / 1000)} kg`;
}
