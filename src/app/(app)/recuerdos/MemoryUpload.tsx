"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images/resize";
import { addMemory } from "@/lib/memories/actions";

export function MemoryUpload({ spaceId }: { spaceId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setTakenOn("");
    setError(null);
  }

  async function save() {
    if (!file) return;
    setSaving(true);
    setError(null);

    let blob: Blob;
    try {
      blob = await resizeImage(file, 1600);
    } catch {
      setSaving(false);
      setError("No se pudo leer esa imagen. Prueba con otra.");
      return;
    }

    const supabase = createClient();
    const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("memories")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) {
      setSaving(false);
      setError("No se pudo subir la foto. Inténtalo de nuevo.");
      return;
    }

    const result = await addMemory({ path, caption, takenOn });
    if (result.error) {
      // Que no quede una foto huérfana en el almacén si no se pudo registrar.
      await supabase.storage.from("memories").remove([path]);
      setSaving(false);
      setError(result.error);
      return;
    }

    setSaving(false);
    reset();
    router.refresh();
  }

  const fieldStyle = { background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" };

  return (
    <div className="mx-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <ImagePlus size={18} />
          Añadir un recuerdo
        </button>
      ) : (
        <div
          className="flex flex-col gap-3 rounded-2xl border p-4"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          {previewUrl ? (
            <div className="relative h-64 w-full overflow-hidden rounded-xl">
              <Image src={previewUrl} alt="Vista previa" fill unoptimized className="object-cover" />
            </div>
          ) : null}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder="Un pie de foto (opcional)"
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={fieldStyle}
          />
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            ¿Cuándo fue? (opcional)
            <input
              type="date"
              value={takenOn}
              onChange={(e) => setTakenOn(e.target.value)}
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={fieldStyle}
            />
          </label>
          {error ? (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundImage: "var(--color-gradient)" }}
            >
              {saving ? "Guardando…" : "Guardar recuerdo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
