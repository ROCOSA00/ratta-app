"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

export function AvatarUpload({
  userId,
  currentAvatarUrl,
}: {
  userId: string;
  currentAvatarUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Elige una imagen.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("La imagen pesa demasiado (máx. 3 MB).");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const path = `${userId}/avatar`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError("No se pudo subir la imagen. Inténtalo de nuevo.");
      setUploading(false);
      return;
    }

    // Con upsert en la misma ruta, la URL pública no cambia — añadimos
    // un parámetro para que el navegador no muestre la foto antigua en caché.
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const freshUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: freshUrl })
      .eq("id", userId);

    setUploading(false);

    if (updateError) {
      setError("Imagen subida, pero no se pudo guardar en tu perfil.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative h-20 w-20 overflow-hidden rounded-full border-2 disabled:opacity-60"
        style={{ borderColor: "var(--color-line)", background: "var(--color-bg)" }}
        aria-label="Cambiar tu foto de perfil"
      >
        {currentAvatarUrl ? (
          <Image src={currentAvatarUrl} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-3xl"
            style={{ color: "var(--color-muted)" }}
          >
            🙂
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        {uploading ? "Subiendo…" : "Toca para cambiar tu foto"}
      </p>
      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
