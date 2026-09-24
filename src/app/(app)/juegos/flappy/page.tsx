import { PageHeader } from "@/components/shared/PageHeader";
import { getFlappySummary } from "@/lib/games/get-flappy-summary";
import { FlappyGame } from "./FlappyGame";

export default async function FlappyPage() {
  const summary = await getFlappySummary();

  return (
    <>
      <PageHeader title="Flappy Rata" subtitle="Esquiva las tuberías 🐀" backHref="/juegos" />
      {summary ? (
        <FlappyGame summary={summary} />
      ) : (
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      )}
    </>
  );
}
