import { createClient } from "@/lib/supabase/client";
type Kind = "avatar" | "cover";

/** Tamaño y forma de cada imagen (lo usa el editor de recorte). */
export const PROFILE_IMAGE: Record<Kind, { aspect: number; outputWidth: number }> = {
  avatar: { aspect: 1, outputWidth: 512 },
  cover: { aspect: 2, outputWidth: 1600 },
};

const COLUMN: Record<Kind, "avatar_url" | "cover_url"> = { avatar: "avatar_url", cover: "cover_url" };

/**
 * Sube tu foto de perfil o tu portada, ya recortada en el editor
 * (ImageCropper). Va al bucket público "avatars", en tu propia carpeta
 * (<tu-uuid>/avatar o /cover), que es la única en la que la RLS te deja
 * escribir. Devuelve un mensaje de error para mostrar, o null si todo fue bien.
 */
export async function uploadProfileImage(kind: Kind, userId: string, blob: Blob): Promise<string | null> {
  const supabase = createClient();
  const path = `${userId}/${kind}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (uploadError) return "No se pudo subir la imagen. Inténtalo de nuevo.";

  // Con upsert en la misma ruta la URL pública no cambia: el parámetro
  // evita que el navegador siga mostrando la foto antigua de su caché.
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [COLUMN[kind]]: `${data.publicUrl}?v=${Date.now()}` })
    .eq("id", userId);

  return updateError ? "Imagen subida, pero no se pudo guardar en tu perfil." : null;
}
