import { PageHeader } from "@/components/shared/PageHeader";
import { getHeartsSummary } from "@/lib/hearts/get-hearts-summary";
import { HeartsGame } from "./HeartsGame";

export default async function CorazonesPage() {
  const summary = await getHeartsSummary();

  return (
    <>
      <PageHeader title="Corazones" subtitle="A ver quién manda más 💘" backHref="/juegos" />
      {summary ? (
        <HeartsGame summary={summary} />
      ) : (
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      )}
    </>
  );
}
