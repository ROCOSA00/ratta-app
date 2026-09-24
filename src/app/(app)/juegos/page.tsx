import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { getPoopSummary } from "@/lib/poop/get-poop-summary";
import { getHeartsSummary } from "@/lib/hearts/get-hearts-summary";
import { getFlappySummary } from "@/lib/games/get-flappy-summary";

function GameCard({
  href,
  emoji,
  title,
  description,
  today,
  tint,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  today: string | null;
  tint: string;
}) {
  return (
    <Link
      href={href}
      className="mx-5 flex items-center gap-4 rounded-2xl border p-4"
      style={{
        background: `color-mix(in srgb, ${tint} 7%, var(--color-surface))`,
        borderColor: `color-mix(in srgb, ${tint} 20%, var(--color-line))`,
      }}
    >
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
        style={{ background: `color-mix(in srgb, ${tint} 16%, var(--color-surface))` }}
      >
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {description}
        </p>
        {today ? (
          <p className="mt-1 text-xs font-semibold" style={{ color: tint }}>
            {today}
          </p>
        ) : null}
      </div>
      <ChevronRight size={20} style={{ color: "var(--color-muted)" }} />
    </Link>
  );
}

export default async function JuegosPage() {
  const [poop, hearts, flappy] = await Promise.all([getPoopSummary(), getHeartsSummary(), getFlappySummary()]);

  let poopToday: string | null = null;
  if (poop) {
    const parts = poop.orderedIds.map((id) => {
      const name = id === poop.currentUserId ? "tú" : (poop.displayNameById.get(id) ?? "tu pareja");
      return `${name} ${poop.stats[id]?.today ?? 0}`;
    });
    poopToday = `Hoy: ${parts.join(" · ")}`;
  }

  const heartsToday = hearts
    ? `Hoy: tú ${hearts.me.totals.today}${hearts.partner ? ` · ${hearts.partner.name} ${hearts.partner.totals.today}` : ""}`
    : null;

  const flappyRecords = flappy
    ? `Récord: tú ${flappy.me.best}${flappy.partner ? ` · ${flappy.partner.name} ${flappy.partner.best}` : ""}`
    : null;

  return (
    <>
      <PageHeader title="Juegos" subtitle="Piques sanos entre vosotros dos" />
      <div className="mt-5 flex flex-col gap-3">
        <GameCard
          href="/juegos/trono"
          emoji="👑"
          title="El Trono"
          description="Registra tus visitas al baño y compite"
          today={poopToday}
          tint="var(--color-gold)"
        />
        <GameCard
          href="/juegos/corazones"
          emoji="💖"
          title="Corazones"
          description="Pulsa sin parar y manda corazones"
          today={heartsToday}
          tint="var(--color-accent)"
        />
        <GameCard
          href="/juegos/flappy"
          emoji="🐀"
          title="Flappy Rata"
          description="Toca para volar y esquiva las tuberías"
          today={flappyRecords}
          tint="var(--color-accent-2)"
        />
      </div>
    </>
  );
}
