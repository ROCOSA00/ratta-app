import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CapsuleSummary } from "@/lib/capsules/get-capsules";
import { countdownLabel } from "@/lib/capsules/config";
import { todayKey } from "@/lib/calendar/date-utils";

/**
 * En Inicio, solo si hay algo: una carta para abrir (destacada) o cartas de
 * tu pareja esperando su día (con la cuenta atrás de la más próxima).
 */
export function CapsuleHomeCard({ capsules }: { capsules: CapsuleSummary[] }) {
  const forMe = capsules.filter((c) => !c.mine);
  const toOpen = forMe.find((c) => c.ready && !c.opened_at);
  const waiting = forMe.filter((c) => !c.ready);

  if (toOpen) {
    return (
      <Link
        href={`/capsulas/${toOpen.id}`}
        className="love-day relative mx-5 flex items-center gap-3 overflow-hidden rounded-2xl p-4 text-white"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <span aria-hidden className="love-day-hearts" />
        <span className="capsule-wiggle flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl">
          💌
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-bold">¡Tienes una carta para abrir!</p>
          <p className="mt-0.5 text-xs font-semibold opacity-95">De {toOpen.authorName}, de la cápsula del tiempo</p>
        </div>
        <ChevronRight size={18} className="relative" />
      </Link>
    );
  }

  const [soonest] = waiting;
  if (!soonest) return null;

  return (
    <Link
      href="/capsulas"
      className="mx-5 flex items-center gap-3 rounded-2xl border p-4"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))",
        borderColor: "color-mix(in srgb, var(--color-accent) 20%, var(--color-line))",
      }}
    >
      <span className="text-2xl">💌</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          {waiting.length === 1 ? "Hay una carta esperándote" : `Hay ${waiting.length} cartas esperándote`}
        </p>
        <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--color-accent)" }}>
          {countdownLabel(soonest.open_on, todayKey())} · de {soonest.authorName}
        </p>
      </div>
      <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
    </Link>
  );
}
