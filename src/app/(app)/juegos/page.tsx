import { PageHeader } from "@/components/shared/PageHeader";
import { LogButton } from "@/components/features/LogButton";
import { getPoopSummary } from "@/lib/poop/get-poop-summary";
import { StatsCard } from "./StatsCard";

export default async function JuegosPage() {
  const summary = await getPoopSummary();

  if (!summary) {
    return (
      <>
        <PageHeader title="Juegos" subtitle="El Trono y algo más" />
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      </>
    );
  }

  const { currentUserId, orderedIds, stats, displayNameById, comparison } = summary;

  return (
    <>
      <PageHeader title="Juegos" subtitle="El Trono y algo más" />
      <div className="mt-5 flex flex-col gap-5">
        <LogButton />

        {comparison ? (
          <p className="mx-5 text-center text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            {comparison}
          </p>
        ) : null}

        <div className="mx-5 grid grid-cols-2 gap-3">
          {orderedIds.map((id) => (
            <StatsCard
              key={id}
              name={id === currentUserId ? "Tú" : (displayNameById.get(id) ?? "Compañero/a")}
              stats={stats[id]}
            />
          ))}
        </div>
      </div>
    </>
  );
}
