import Link from "next/link";
import { CalendarDays, ChevronRight, Crown, Flame, Heart, Pin } from "lucide-react";
import type { ComponentType } from "react";
import { RattaLogo } from "@/components/shared/RattaLogo";
import { QuestionOfTheDay } from "@/components/features/QuestionOfTheDay";
import { LogButton } from "@/components/features/LogButton";
import { NudgeButtons } from "@/components/features/NudgeButtons";
import { getNextEvent } from "@/lib/events/get-next-event";
import { getPinnedNote } from "@/lib/notes/get-pinned-note";
import { getPoopSummary } from "@/lib/poop/get-poop-summary";
import { getLatestNudge } from "@/lib/nudges/get-latest-nudge";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format-date";

function SectionCard({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{
        background: `color-mix(in srgb, ${tint} 7%, var(--color-surface))`,
        borderColor: `color-mix(in srgb, ${tint} 20%, var(--color-line))`,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  tint,
  label,
  right,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tint: string;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`, color: tint }}
        >
          <Icon size={15} strokeWidth={2.3} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: tint }}>
          {label}
        </p>
      </div>
      {right}
    </div>
  );
}

export default async function InicioPage() {
  const [nextEvent, pinnedNote, poopSummary, latestNudge] = await Promise.all([
    getNextEvent(),
    getPinnedNote(),
    getPoopSummary(),
    getLatestNudge(),
  ]);

  return (
    <>
      <header
        className="px-5 pb-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-2) 10%, var(--color-bg)) 0%, var(--color-bg) 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-[26%] p-3.5 shadow-lg"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <RattaLogo className="h-full w-full text-white" />
          </span>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
              Ratta
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Nuestro pequeño mundo para dos.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 pb-2">
        <Link href="/calendario">
          <SectionCard tint="var(--color-accent-2)">
            <SectionHeader
              icon={CalendarDays}
              tint="var(--color-accent-2)"
              label="Próximo evento"
              right={<ChevronRight size={16} style={{ color: "var(--color-muted)" }} />}
            />
            {nextEvent ? (
              <>
                <p className="mt-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                  {nextEvent.title}
                </p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
                  {nextEvent.all_day ? formatDate(nextEvent.start_at) : formatDateTime(nextEvent.start_at)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                No hay ningún evento próximo.
              </p>
            )}
          </SectionCard>
        </Link>

        <QuestionOfTheDay />

        <SectionCard tint="var(--color-accent)">
          <SectionHeader icon={Heart} tint="var(--color-accent)" label="Cariño" />
          {latestNudge ? (
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink)" }}>
              {latestNudge.emoji} <b>{latestNudge.senderName}</b>: {latestNudge.label}
              {" · "}
              <span style={{ color: "var(--color-muted)" }}>{formatRelative(latestNudge.createdAt)}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              Mándale un mensajito a tu pareja.
            </p>
          )}
          <div className="mt-3">
            <NudgeButtons />
          </div>
        </SectionCard>

        <SectionCard tint="var(--color-gold)">
          <SectionHeader
            icon={Crown}
            tint="var(--color-gold)"
            label="El Trono"
            right={
              <Link
                href="/juegos"
                className="flex items-center gap-0.5 text-xs"
                style={{ color: "var(--color-muted)" }}
              >
                Ver más <ChevronRight size={14} />
              </Link>
            }
          />

          {poopSummary ? (
            <>
              <div className="mt-3 flex items-center justify-center">
                <LogButton />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {poopSummary.orderedIds.map((id) => {
                  const s = poopSummary.stats[id];
                  const name =
                    id === poopSummary.currentUserId
                      ? "Tú"
                      : (poopSummary.displayNameById.get(id) ?? "Compañero/a");
                  return (
                    <div
                      key={id}
                      className="rounded-xl p-2.5 text-center"
                      style={{ background: "color-mix(in srgb, var(--color-gold) 10%, var(--color-surface))" }}
                    >
                      <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                        {name}
                      </p>
                      <p className="font-mono-nums text-xl font-bold" style={{ color: "var(--color-accent)" }}>
                        {s?.today ?? 0}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                        hoy
                      </p>
                      {s && s.streak > 0 ? (
                        <p
                          className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold"
                          style={{ color: "var(--color-gold)" }}
                        >
                          <Flame size={11} /> {s.streak}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {poopSummary.comparison ? (
                <p className="mt-2 text-center text-xs" style={{ color: "var(--color-muted)" }}>
                  {poopSummary.comparison}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              No perteneces a ningún espacio todavía.
            </p>
          )}
        </SectionCard>

        <Link href="/notas">
          <SectionCard tint="var(--color-accent-2)">
            <SectionHeader
              icon={Pin}
              tint="var(--color-accent-2)"
              label="Tu nota fijada"
              right={<ChevronRight size={16} style={{ color: "var(--color-muted)" }} />}
            />
            {pinnedNote ? (
              <>
                <p className="mt-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                  {pinnedNote.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm" style={{ color: "var(--color-muted)" }}>
                  {pinnedNote.content}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                No tienes ninguna nota fijada. Ve a Notas y fija una con el
                icono de chincheta.
              </p>
            )}
          </SectionCard>
        </Link>
      </div>
    </>
  );
}
