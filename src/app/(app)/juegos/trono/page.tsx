import { PageHeader } from "@/components/shared/PageHeader";
import { LogButton } from "@/components/features/LogButton";
import { getPoopSummary } from "@/lib/poop/get-poop-summary";
import { addDays, todayKey, WEEKDAY_LABELS, weekdayMon0 } from "@/lib/calendar/date-utils";
import { StatsCard } from "./StatsCard";
import { WeekChart } from "./WeekChart";

const SERIES_COLORS = ["var(--color-accent)", "var(--color-accent-2)"];

export default async function TronoPage() {
  const summary = await getPoopSummary();

  if (!summary) {
    return (
      <>
        <PageHeader title="El Trono" subtitle="Quién reina en el baño 👑" backHref="/juegos" />
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      </>
    );
  }

  const { currentUserId, orderedIds, stats, displayNameById, comparison } = summary;
  const nameOf = (id: string) => (id === currentUserId ? "Tú" : (displayNameById.get(id) ?? "Compañero/a"));

  const today = todayKey();
  const dayLabels = Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS[weekdayMon0(addDays(today, i - 6))]!);

  return (
    <>
      <PageHeader title="El Trono" subtitle="Quién reina en el baño 👑" backHref="/juegos" />
      <div className="mt-5 flex flex-col gap-5">
        <LogButton />

        {comparison ? (
          <p className="mx-5 text-center text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            {comparison}
          </p>
        ) : null}

        <div className="mx-5 grid grid-cols-2 gap-3">
          {orderedIds.map((id) => (
            <StatsCard key={id} name={nameOf(id)} stats={stats[id]} />
          ))}
        </div>

        <WeekChart
          labels={dayLabels}
          series={orderedIds.map((id, i) => ({
            name: nameOf(id),
            values: stats[id]?.last7 ?? [],
            color: SERIES_COLORS[i % SERIES_COLORS.length]!,
          }))}
        />
      </div>
    </>
  );
}
