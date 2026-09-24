"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { todayKey } from "@/lib/calendar/date-utils";

const VIEWS = [
  { key: "list", label: "Lista" },
  { key: "month", label: "Mes" },
  { key: "week", label: "Semana" },
] as const;

const hrefFor = (key: string, refKey: string) =>
  key === "list" ? "/calendario?view=list" : `/calendario?view=${key}&ref=${refKey || todayKey()}`;

/**
 * Lista / Mes / Semana. La pestaña cambia al instante al tocarla (antes no
 * pasaba nada hasta que llegaba la página nueva) y las otras dos vistas se
 * precargan en segundo plano, así casi siempre el cambio es inmediato.
 */
export function ViewToggle({ view, refKey }: { view: string; refKey: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(view);

  useEffect(() => setSelected(view), [view]);

  useEffect(() => {
    for (const { key } of VIEWS) if (key !== view) router.prefetch(hrefFor(key, refKey));
  }, [router, view, refKey]);

  return (
    <div
      className="mx-5 flex gap-1 rounded-xl p-1 transition-opacity"
      style={{ background: "var(--color-line)", opacity: isPending ? 0.75 : 1 }}
    >
      {VIEWS.map(({ key, label }) => {
        const isActive = selected === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (key === selected) return;
              setSelected(key);
              startTransition(() => router.push(hrefFor(key, refKey)));
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: isActive ? "var(--color-surface)" : "transparent",
              color: isActive ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {label}
            {isActive && isPending ? (
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
