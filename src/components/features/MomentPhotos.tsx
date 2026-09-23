"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { MomentPhoto } from "@/lib/moments/get-moments";
import { lateLabel } from "@/lib/moments/config";
import { TIME_ZONE } from "@/lib/format-date";

const timeFormatter = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

/**
 * Las fotos del Momento de un día, una al lado de la otra. `slots` permite
 * enseñar un hueco para quien aún no ha subido (o cuya foto aún no puedes ver).
 */
export function MomentPhotos({
  photos,
  names,
  slots = [],
}: {
  photos: MomentPhoto[];
  names: Record<string, string>;
  slots?: { key: string; label: string; hint: string }[];
}) {
  const [viewing, setViewing] = useState<MomentPhoto | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setViewing(photo)}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl"
              style={{ background: "var(--color-line)" }}
              aria-label={`Ver el Momento de ${names[photo.user_id] ?? "tu pareja"}`}
            >
              {photo.url ? (
                <Image src={photo.url} alt="Momento" fill sizes="50vw" unoptimized className="object-cover" />
              ) : null}
              <span
                className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ background: "rgba(0,0,0,0.45)" }}
              >
                {names[photo.user_id] ?? "Tu pareja"} · {timeFormatter.format(new Date(photo.created_at))}
              </span>
            </button>
            <p
              className="px-1 text-xs font-semibold"
              style={{ color: photo.late_seconds > 0 ? "var(--color-gold)" : "var(--color-accent)" }}
            >
              {lateLabel(photo.late_seconds)}
            </p>
            {photo.caption ? (
              <p className="px-1 text-sm" style={{ color: "var(--color-ink)" }}>
                {photo.caption}
              </p>
            ) : null}
          </div>
        ))}
        {slots.map((slot) => (
          <div
            key={slot.key}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-3 text-center"
            style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
          >
            <span className="text-2xl">{slot.label}</span>
            <span className="text-xs">{slot.hint}</span>
          </div>
        ))}
      </div>

      {viewing ? (
        <div
          role="dialog"
          aria-label="Momento"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setViewing(null)}
        >
          {viewing.url ? <Image src={viewing.url} alt="Momento" fill unoptimized className="object-contain" /> : null}
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
    </>
  );
}
