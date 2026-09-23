import type { UserStats } from "@/lib/poop/stats";

const emptyStats: Omit<UserStats, "userId"> = {
  today: 0,
  week: 0,
  month: 0,
  year: 0,
  total: 0,
  streak: 0,
  bestDay: 0,
  last7: [],
  badges: [],
};

export function StatsCard({ name, stats }: { name: string; stats: UserStats | undefined }) {
  const s = stats ?? emptyStats;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: "color-mix(in srgb, var(--color-gold) 7%, var(--color-surface))",
        borderColor: "color-mix(in srgb, var(--color-gold) 20%, var(--color-line))",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
        {name}
      </p>
      <p className="font-mono-nums mt-1 text-3xl font-bold" style={{ color: "var(--color-accent)" }}>
        {s.total}
      </p>
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
        en total
      </p>

      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs" style={{ color: "var(--color-muted)" }}>
        <span>
          Hoy: <b style={{ color: "var(--color-ink)" }}>{s.today}</b>
        </span>
        <span>
          Semana: <b style={{ color: "var(--color-ink)" }}>{s.week}</b>
        </span>
        <span>
          Mes: <b style={{ color: "var(--color-ink)" }}>{s.month}</b>
        </span>
        <span>
          Año: <b style={{ color: "var(--color-ink)" }}>{s.year}</b>
        </span>
      </div>

      {s.streak > 0 ? (
        <p className="mt-2 text-xs font-medium" style={{ color: "var(--color-gold)" }}>
          🔥 Racha de {s.streak} día{s.streak === 1 ? "" : "s"}
        </p>
      ) : null}

      {s.bestDay > 0 ? (
        <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          🏆 Récord: {s.bestDay} en un día
        </p>
      ) : null}

      {s.badges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{
                background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
                color: "var(--color-accent)",
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
