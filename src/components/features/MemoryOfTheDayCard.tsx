import Image from "next/image";
import Link from "next/link";
import { Camera, ChevronRight } from "lucide-react";
import { getMemoryOfTheDay } from "@/lib/memories/get-memories";
import { formatDate } from "@/lib/format-date";

export async function MemoryOfTheDayCard() {
  const { memory, total } = await getMemoryOfTheDay();

  return (
    <Link
      href={memory ? `/recuerdos/${memory.id}` : "/recuerdos"}
      className="mx-5 block overflow-hidden rounded-2xl border"
      style={{
        background: "color-mix(in srgb, var(--color-gold) 7%, var(--color-surface))",
        borderColor: "color-mix(in srgb, var(--color-gold) 20%, var(--color-line))",
      }}
    >
      {memory?.url ? (
        <div className="relative aspect-[4/3] w-full">
          <Image src={memory.url} alt={memory.caption ?? "Recuerdo del día"} fill unoptimized className="object-cover" />
          <div
            className="absolute inset-x-0 bottom-0 p-4 text-white"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)" }}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-90">
              <Camera size={13} /> Recuerdo del día
            </p>
            {memory.caption ? <p className="mt-0.5 text-base font-semibold">{memory.caption}</p> : null}
            <p className="text-xs opacity-80">
              {memory.taken_on ? formatDate(`${memory.taken_on}T12:00:00Z`) : formatDate(memory.created_at)}
              {total > 1 ? ` · ${total} recuerdos` : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in srgb, var(--color-gold) 18%, var(--color-surface))", color: "var(--color-gold)" }}
          >
            <Camera size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Recuerdos
            </span>
            <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
              Sube vuestras fotos y cada día os enseño una.
            </span>
          </span>
          <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
        </div>
      )}
    </Link>
  );
}
