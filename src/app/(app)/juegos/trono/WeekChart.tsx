import { BarChart3 } from "lucide-react";

type Series = { name: string; values: number[]; color: string };

export function WeekChart({ labels, series }: { labels: string[]; series: Series[] }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{
        background: "color-mix(in srgb, var(--color-gold) 7%, var(--color-surface))",
        borderColor: "color-mix(in srgb, var(--color-gold) 20%, var(--color-line))",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-gold)" }}>
          <BarChart3 size={14} />
          Últimos 7 días
        </p>
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-muted)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid h-28 grid-cols-7 items-end gap-2">
        {labels.map((label, dayIndex) => (
          <div key={dayIndex} className="flex h-full flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              {series.map((s) => {
                const value = s.values[dayIndex] ?? 0;
                return (
                  <div
                    key={s.name}
                    title={`${s.name}: ${value}`}
                    className="w-full max-w-[10px] rounded-t-md"
                    style={{
                      height: value === 0 ? "3px" : `${(value / max) * 100}%`,
                      background: value === 0 ? "var(--color-line)" : s.color,
                    }}
                  />
                );
              })}
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: dayIndex === labels.length - 1 ? "var(--color-ink)" : "var(--color-muted)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
