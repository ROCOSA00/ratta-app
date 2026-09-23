"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images/resize";
import { addEventPhoto, deleteEventPhoto } from "../actions";
import { EVENT_PHOTOS_BUCKET } from "@/lib/events/photos-config";
import type { EventPhoto } from "@/lib/events/get-event";
import { formatDateTime } from "@/lib/format-date";

export function EventPhotos({
  eventId,
  spaceId,
  photos,
  names,
  canAdd,
}: {
  eventId: string;
  spaceId: string;
  photos: EventPhoto[];
  names: Record<string, string>;
  canAdd: boolean;
}) {
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<EventPhoto | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(files: File[]) {
    setError(null);
    const supabase = createClient();
    let failed = 0;
    for (const [i, file] of files.entries()) {
      setProgress(files.length > 1 ? `Subiendo ${i + 1} de ${files.length}…` : "Subiendo foto…");
      let blob: Blob;
      try {
        blob = await resizeImage(file, 1600);
      } catch {
        failed += 1;
        continue;
      }
      const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(EVENT_PHOTOS_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) {
        failed += 1;
        continue;
      }
      const result = await addEventPhoto({ eventId, path });
      if (result.error) {
        // Que no quede una foto huérfana en el almacén si no se pudo registrar.
        await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove([path]);
        setError(result.error);
        failed += 1;
      }
    }
    setProgress(null);
    if (failed > 0 && files.length > 1) setError(`No se pudieron subir ${failed} de ${files.length} fotos.`);
    else if (failed > 0) setError((current) => current ?? "No se pudo subir la foto. Inténtalo de nuevo.");
    router.refresh();
  }

  function remove(photo: EventPhoto) {
    if (!window.confirm("¿Quitar esta foto del plan? No se puede deshacer.")) return;
    startDelete(async () => {
      const result = await deleteEventPhoto(photo.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setViewing(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-5 flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        📸 Fotos del plan {photos.length > 0 ? `(${photos.length})` : ""}
      </p>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setViewing(photo)}
              className="relative aspect-square overflow-hidden rounded-xl"
              style={{ background: "var(--color-line)" }}
              aria-label="Ver foto en grande"
            >
              {photo.url ? (
                <Image src={photo.url} alt="Foto del plan" fill sizes="33vw" unoptimized className="object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {canAdd ? "Aún no hay fotos. ¡Haced la primera!" : "Podréis añadir fotos a partir del día del plan."}
        </p>
      )}

      {canAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length > 0) void upload(files);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={progress !== null}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <Camera size={18} />
            {progress ?? "Añadir fotos"}
          </button>
        </>
      ) : null}

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      {viewing ? (
        <div
          role="dialog"
          aria-label="Foto del plan"
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setViewing(null)}
        >
          <div className="relative flex-1">
            {viewing.url ? (
              <Image src={viewing.url} alt="Foto del plan" fill unoptimized className="object-contain" />
            ) : null}
          </div>
          <div
            className="flex items-center justify-between gap-3 px-5 pt-3 text-white"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm opacity-80">
              {names[viewing.uploaded_by] ?? "Alguien"} · {formatDateTime(viewing.created_at)}
            </p>
            <button
              type="button"
              onClick={() => remove(viewing)}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 size={15} />
              {isDeleting ? "Quitando…" : "Quitar"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Cerrar"
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
          >
            <X size={20} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
