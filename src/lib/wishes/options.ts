export const WISH_CATEGORIES = [
  { id: "lugar", emoji: "🌍", label: "Sitios" },
  { id: "plan", emoji: "🎉", label: "Planes" },
  { id: "peli", emoji: "🎬", label: "Pelis y series" },
  { id: "comida", emoji: "🍣", label: "Comida" },
  { id: "otro", emoji: "✨", label: "Otros" },
] as const;

export type WishCategory = (typeof WISH_CATEGORIES)[number]["id"];

export const WISH_CATEGORY_IDS = WISH_CATEGORIES.map((c) => c.id) as [WishCategory, ...WishCategory[]];

export function findCategory(id: string) {
  return WISH_CATEGORIES.find((c) => c.id === id) ?? WISH_CATEGORIES[WISH_CATEGORIES.length - 1]!;
}

export type Wish = {
  id: string;
  title: string;
  category: WishCategory;
  note: string | null;
  created_by: string;
  created_at: string;
  done_at: string | null;
  done_by: string | null;
};
