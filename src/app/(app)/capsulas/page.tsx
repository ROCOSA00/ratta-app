import Link from "next/link";
import { Lock, MailOpen, PenLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { getCapsules, type CapsuleSummary } from "@/lib/capsules/get-capsules";
import { countdownLabel, shortDate } from "@/lib/capsules/config";
import { todayKey, toDateKey } from "@/lib/calendar/date-utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-5">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {title}
      </p>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function CapsuleCard({ capsule, today }: { capsule: CapsuleSummary; today: string }) {
  const toOpen = !capsule.mine && capsule.ready && !capsule.opened_at;
  const from = capsule.mine ? "Tu carta" : `De ${capsule.authorName}`;

  if (toOpen) {
    return (
      <li>
        <Link
          href={`/capsulas/${capsule.id}`}
          className="love-day relative flex items-center gap-3 overflow-hidden rounded-2xl p-4 text-white"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <span aria-hidden className="love-day-hearts" />
          <span className="capsule-wiggle flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl">
            💌
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-bold">¡Ya puedes abrirla!</p>
            <p className="mt-0.5 text-xs font-semibold opacity-95">
              {from} · escrita el {shortDate(toDateKey(new Date(capsule.created_at)))}
            </p>
          </div>
        </Link>
      </li>
    );
  }

  const locked = !capsule.ready;
  return (
    <li>
      <Link
        href={`/capsulas/${capsule.id}`}
        className="flex items-center gap-3 rounded-2xl border p-4"
        style={{
          background: locked
            ? "color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))"
            : "var(--color-surface)",
          borderColor: locked
            ? "color-mix(in srgb, var(--color-accent) 18%, var(--color-line))"
            : "var(--color-line)",
        }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))",
            color: "var(--color-accent)",
          }}
        >
          {locked ? <Lock size={17} /> : <MailOpen size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            {from}
          </p>
          <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--color-accent)" }}>
            {locked
              ? `${countdownLabel(capsule.open_on, today)} · ${shortDate(capsule.open_on)}`
              : capsule.opened_at
                ? `Abierta el ${shortDate(toDateKey(new Date(capsule.opened_at)))}`
                : `Se abrió el ${shortDate(capsule.open_on)}`}
          </p>
          {capsule.hint ? (
            <p className="mt-1 truncate text-xs italic" style={{ color: "var(--color-muted)" }}>
              «{capsule.hint}»
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export default async function CapsulasPage() {
  const { capsules } = await getCapsules();
  const today = todayKey();

  const toOpen = capsules.filter((c) => !c.mine && c.ready && !c.opened_at);
  const waiting = capsules.filter((c) => !c.ready);
  const opened = capsules.filter((c) => c.ready && (c.mine || c.opened_at)).reverse();

  return (
    <>
      <PageHeader title="Cápsulas del tiempo" subtitle="Cartas para abrir en el futuro" backHref="/perfil" />
      <div className="mt-4 flex flex-col gap-5 pb-4">
        <div className="mx-5">
          <Link
            href="/capsulas/nueva"
            className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <PenLine size={17} />
            Escribir una carta
          </Link>
        </div>

        {capsules.length === 0 ? (
          <div
            className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
          >
            <span className="text-4xl">💌</span>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Aún no hay ninguna carta
            </p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Escribe una carta (con foto si quieres) y elige el día en que se abrirá: vuestro aniversario, el
              próximo día 6… Hasta entonces, tu pareja sabrá que existe, pero no lo que dice.
            </p>
          </div>
        ) : null}

        {toOpen.length > 0 ? (
          <Section title="💌 Para abrir">
            {toOpen.map((c) => (
              <CapsuleCard key={c.id} capsule={c} today={today} />
            ))}
          </Section>
        ) : null}

        {waiting.length > 0 ? (
          <Section title="🔒 Esperando">
            {waiting.map((c) => (
              <CapsuleCard key={c.id} capsule={c} today={today} />
            ))}
          </Section>
        ) : null}

        {opened.length > 0 ? (
          <Section title="📬 Abiertas">
            {opened.map((c) => (
              <CapsuleCard key={c.id} capsule={c} today={today} />
            ))}
          </Section>
        ) : null}
      </div>
    </>
  );
}
