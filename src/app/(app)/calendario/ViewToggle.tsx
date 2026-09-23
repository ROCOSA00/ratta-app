import Link from "next/link";
import { todayKey } from "@/lib/calendar/date-utils";

const VIEWS = [
  { key: "list", label: "Lista" },
  { key: "month", label: "Mes" },
  { key: "week", label: "Semana" },
] as const;

export function ViewToggle({ view, refKey }: { view: string; refKey: string }) {
  return (
    <div className="mx-5 flex gap-1 rounded-xl p-1" style={{ background: "var(--color-line)" }}>
      {VIEWS.map(({ key, label }) => {
        const isActive = view === key;
        const href = key === "list" ? "/calendario?view=list" : `/calendario?view=${key}&ref=${refKey || todayKey()}`;
        return (
          <Link
            key={key}
            href={href}
            className="flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-colors"
            style={{
              background: isActive ? "var(--color-surface)" : "transparent",
              color: isActive ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
