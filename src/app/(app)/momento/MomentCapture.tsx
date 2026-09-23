"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images/resize";
import { postMoment } from "@/lib/moments/actions";
import { MOMENT_BUCKET } from "@/lib/moments/config";

/** Hacer la foto del Momento (solo cámara), añadir un texto y subirla. */
export function MomentCapture({ spaceId }: { spaceId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save() {
    if (!file) return;
    setSaving(true);
    setError(null);

    let blob: Blob;
    try {
      blob = await resizeImage(file, 1600);
    } catch {
      setSaving(false);
      setError("No se pudo leer esa foto. Prueba otra vez.");
      return;
    }

    const supabase = createClient();
    const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(MOMENT_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) {
      setSaving(false);
      setError("No se pudo subir la foto. Inténtalo de nuevo.");
      return;
    }

    const result = await postMoment({ path, caption });
    if (result.error) {
      // Que no quede una foto huérfana en el almacén si no se pudo registrar.
      await supabase.storage.from(MOMENT_BUCKET).remove([path]);
      setSaving(false);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* capture: abre la cámara directamente, sin galería (como BeReal). */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (picked) {
            setError(null);
            setFile(picked);
          }
        }}
      />

      {preview ? (
        <>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl">
            <Image src={preview} alt="Tu Momento" fill unoptimized className="object-cover" />
          </div>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={140}
            placeholder="¿Qué estás haciendo? (opcional)"
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
            >
              <RotateCcw size={15} />
              Repetir
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundImage: "var(--color-gradient)" }}
            >
              {saving ? "Subiendo…" : "Subir mi Momento"}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-semibold text-white shadow-lg"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <Camera size={20} />
          Hacer la foto
        </button>
      )}

      {error ? (
        <p className="text-center text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
