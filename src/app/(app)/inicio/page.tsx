import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { RattaLogo } from "@/components/shared/RattaLogo";
import { QuestionOfTheDay } from "@/components/features/QuestionOfTheDay";
import { LogButton } from "@/components/features/LogButton";
import { getNextEvent } from "@/lib/events/get-next-event";
import { getPinnedNote } from "@/lib/notes/get-pinned-note";
import { getPoopSummary } from "@/lib/poop/get-poop-summary";
import { formatDate, formatDateTime } from "@/lib/format-date";

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>
      {children}
    </p>
  );
}

export default async function InicioPage() {
  const [nextEvent, pinnedNote, poopSummary] = await Promise.all([
    getNextEvent(),
    getPinnedNote(),
    getPoopSummary(),
  ]);

  return (
    <>
      <header
        className="px-5 pb-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)" }}
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
          <SectionCard>
            <div className="flex items-center justify-between">
              <SectionLabel>Próximo evento</SectionLabel>
              <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
            </div>
            {nextEvent ? (
              <>
                <p className="mt-1.5 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                  {nextEvent.title}
                </p>
                <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
                  {nextEvent.all_day ? formatDate(nextEvent.start_at) : formatDateTime(nextEvent.start_at)}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
                No hay ningún evento próximo.
              </p>
            )}
          </SectionCard>
        </Link>

        <QuestionOfTheDay />

        <SectionCard>
          <div className="flex items-center justify-between">
            <SectionLabel>El Trono</SectionLabel>
            <Link
              href="/juegos"
              className="flex items-center gap-0.5 text-xs"
              style={{ color: "var(--color-muted)" }}
            >
              Ver más <ChevronRight size={14} />
            </Link>
          </div>

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
                      style={{ background: "var(--color-bg)" }}
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
                          className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-medium"
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
            <p className="mt-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
              No perteneces a ningún espacio todavía.
            </p>
          )}
        </SectionCard>

        <Link href="/notas">
          <SectionCard>
            <div className="flex items-center justify-between">
              <SectionLabel>Tu nota fijada</SectionLabel>
              <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
            </div>
            {pinnedNote ? (
              <>
                <p className="mt-1.5 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
                  {pinnedNote.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm" style={{ color: "var(--color-muted)" }}>
                  {pinnedNote.content}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
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
