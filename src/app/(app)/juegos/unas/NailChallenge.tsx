"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";
import { sendNailCheer, setNailBites, startNailChallenge } from "@/lib/nails/actions";
import { cheer, NAIL_MILESTONES, nailStats, nextMilestone, type NailStats } from "@/lib/nails/stats";
import type { NailPerson } from "@/lib/nails/get-nails";
import { addDays, dayLabel, dayNumber, monthLabel, startOfMonth, weekdayMon0, WEEKDAY_LABELS } from "@/lib/calendar/date-utils";

const GOOD = "#16a34a";
const BAD = "#e11d48";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function NailChallenge({ me, partner, today }: { me: NailPerson; partner: NailPerson | null; today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showStart, setShowStart] = useState(false);
  const router = useRouter();

  function run(action: () => Promise<{ error: string | null }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  // Solo los retos ya empezados (con su día de inicio).
  const mine = me.startedOn ? { ...me, startedOn: me.startedOn } : null;
  const partnerActive = partner?.startedOn ? { ...partner, startedOn: partner.startedOn } : null;

  // Sin reto propio ni de tu pareja: a empezar.
  if (!mine && !partnerActive) {
    return (
      <div className="mt-5 flex flex-col gap-4 pb-4">
        <StartCard today={today} pending={isPending} onStart={(day) => run(() => startNailChallenge(day))} />
        {error ? <ErrorText text={error} /> : null}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-4 pb-4">
      {mine ? (
        <ChallengeView
          person={mine}
          viewerId={me.id}
          otherName={partner?.name ?? "tu pareja"}
          today={today}
          pending={isPending}
          run={run}
        />
      ) : null}
      {partnerActive ? (
        <ChallengeView
          person={partnerActive}
          viewerId={me.id}
          otherName={me.name}
          today={today}
          pending={isPending}
          run={run}
          // Si tú no tienes reto, el de tu pareja sale en grande.
          compact={!!mine}
        />
      ) : null}
      {error ? <ErrorText text={error} /> : null}

      {me.startedOn ? (
        <ChangeStart
          startedOn={me.startedOn}
          today={today}
          pending={isPending}
          onChange={(day) => run(() => startNailChallenge(day))}
        />
      ) : showStart ? (
        <StartCard today={today} pending={isPending} onStart={(day) => run(() => startNailChallenge(day))} />
      ) : (
        <button
          type="button"
          onClick={() => setShowStart(true)}
          className="mx-5 text-center text-xs font-medium underline"
          style={{ color: "var(--color-muted)" }}
        >
          ¿Y tú? Empezar mi propio reto
        </button>
      )}
    </div>
  );
}

/**
 * Un reto: el tuyo o el de tu pareja. Los mordiscos los puede apuntar
 * cualquiera de los dos; en el de tu pareja, los botones hablan de ella/él.
 * En modo compacto (tu pareja, cuando tú también tienes reto) se ve una
 * tarjeta pequeña con su racha, ánimos y su calendario.
 */
function ChallengeView({
  person,
  viewerId,
  otherName,
  today,
  pending,
  run,
  compact = false,
}: {
  person: NailPerson & { startedOn: string };
  viewerId: string;
  /** El nombre de la otra persona (para «Lo apuntó Giselz»). */
  otherName: string;
  today: string;
  pending: boolean;
  run: (action: () => Promise<{ error: string | null }>, after?: () => void) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [cheered, setCheered] = useState(false);
  const isMine = person.id === viewerId;
  const stats = nailStats(person.startedOn, today, person.bites);
  const bitToday = (stats.byDay[today] ?? 0) > 0;
  const next = nextMilestone(stats.streak);
  const previousMilestone = [...NAIL_MILESTONES].reverse().find((m) => m.days <= stats.streak);
  const progressFrom = previousMilestone?.days ?? 0;
  const progress = next ? (stats.streak - progressFrom) / (next.days - progressFrom) : 1;
  const bitLabel = isMine ? "😬 Me las he mordido" : "😬 Se las ha mordido";

  const cheerButton = isMine ? null : (
    <button
      type="button"
      disabled={cheered || pending}
      onClick={() => run(() => sendNailCheer(), () => setCheered(true))}
      className="shrink-0 rounded-2xl px-4 py-3.5 text-sm font-bold text-white disabled:opacity-70"
      style={{ backgroundImage: "var(--color-gradient)" }}
    >
      {cheered ? "¡Enviado! 💌" : "💪 Ánimos"}
    </button>
  );

  const sheet = editing ? (
    <BiteSheet
      key={editing}
      day={editing}
      today={today}
      startedOn={person.startedOn}
      title={isMine ? "😬 ¿Cuántas veces?" : `😬 ¿Cuántas veces se las ha mordido ${person.name}?`}
      current={stats.byDay[editing] ?? 0}
      currentNote={person.bites.find((b) => b.day === editing)?.note ?? ""}
      reportedBy={reporterLabel(person.bites.find((b) => b.day === editing)?.reportedBy, person, viewerId, otherName)}
      pending={pending}
      onDayChange={setEditing}
      onClose={() => setEditing(null)}
      onSave={(count, note) =>
        run(() => setNailBites({ userId: person.id, day: editing, count, note }), () => setEditing(null))
      }
    />
  ) : null;

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="mx-5 flex items-center gap-3 rounded-2xl border p-4"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          <span className="text-3xl">{stats.streak > 0 ? "🔥" : "😬"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              {person.name} lleva {plural(stats.streak, "día", "días")}
            </p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Mejor racha: {plural(stats.best, "día", "días")}
            </p>
          </div>
          {cheerButton}
        </div>
        <button
          type="button"
          onClick={() => setEditing(today)}
          className="mx-5 rounded-2xl px-4 py-3 text-sm font-bold text-white"
          style={{ background: BAD }}
        >
          {bitLabel}
        </button>
        <CalendarCard
          title={`Calendario de ${person.name}`}
          startedOn={person.startedOn}
          today={today}
          byDay={stats.byDay}
          onPick={setEditing}
        />
        {sheet}
      </div>
    );
  }

  return (
    <>
      {/* La racha */}
      <div
        className="relative mx-5 overflow-hidden rounded-3xl p-5 text-center text-white shadow-lg"
        style={{
          backgroundImage: bitToday
            ? "linear-gradient(150deg, #f97316, #e11d48)"
            : "linear-gradient(150deg, #22c55e, #0d9488)",
        }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-90">
          {isMine ? "Racha actual" : `Reto de ${person.name}`}
        </p>
        <p className="mt-1 flex items-center justify-center gap-2">
          <span className={`text-5xl ${stats.streak > 0 ? "nails-flame" : ""}`}>{stats.streak > 0 ? "🔥" : "😬"}</span>
          <span className="font-mono-nums text-7xl font-black leading-none">{stats.streak}</span>
        </p>
        <p className="mt-1 text-base font-semibold">
          {isMine
            ? stats.streak === 1
              ? "día sin morderte las uñas"
              : "días sin morderte las uñas"
            : stats.streak === 1
              ? "día sin morderse las uñas"
              : "días sin morderse las uñas"}
        </p>
        <p className="mt-2 text-sm opacity-95">{cheer(stats.streak, bitToday)}</p>
        {next ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs font-semibold opacity-95">
              {next.days - stats.streak === 1 ? "Falta 1 día" : `Faltan ${next.days - stats.streak} días`} para {next.emoji}{" "}
              {next.label}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs font-semibold">¡Todas las medallas conseguidas! 🏆</p>
        )}
      </div>

      <div className="mx-5 flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(today)}
          className="min-w-0 flex-1 rounded-2xl px-4 py-3.5 text-sm font-bold text-white shadow"
          style={{ background: BAD }}
        >
          {bitLabel}
        </button>
        {cheerButton}
      </div>
      {bitToday ? (
        <p className="mx-5 -mt-2 text-center text-xs" style={{ color: "var(--color-muted)" }}>
          Hoy {isMine ? "llevas" : "lleva"} {plural(stats.byDay[today] ?? 0, "vez", "veces")}. Toca hoy en el calendario
          para cambiarlo.
        </p>
      ) : null}

      <StatsGrid stats={stats} />
      <Medals best={stats.best} />
      <CalendarCard
        title={isMine ? "Tu calendario" : `Calendario de ${person.name}`}
        startedOn={person.startedOn}
        today={today}
        byDay={stats.byDay}
        onPick={setEditing}
      />
      {sheet}
    </>
  );
}

/** "Lo apuntaste tú" / "Lo apuntó Giselz", solo si no lo apuntó la persona del reto. */
function reporterLabel(
  reportedBy: string | null | undefined,
  person: NailPerson,
  viewerId: string,
  otherName: string,
): string | null {
  if (!reportedBy || reportedBy === person.id) return null;
  return reportedBy === viewerId ? "Lo apuntaste tú" : `Lo apuntó ${otherName}`;
}

function ErrorText({ text }: { text: string }) {
  return (
    <p className="mx-5 text-sm" style={{ color: "var(--color-danger)" }}>
      {text}
    </p>
  );
}

function StartCard({ today, pending, onStart }: { today: string; pending: boolean; onStart: (day: string) => void }) {
  const [day, setDay] = useState(today);
  return (
    <div
      className="mx-5 flex flex-col items-center gap-3 rounded-3xl p-6 text-center text-white shadow-lg"
      style={{ backgroundImage: "linear-gradient(150deg, #22c55e, #0d9488)" }}
    >
      <span className="text-6xl">💅</span>
      <p className="text-xl font-black">¡Deja de morderte las uñas!</p>
      <p className="text-sm opacity-95">
        Cuenta los días que llevas sin mordértelas, apunta si te las muerdes y consigue medallas. Tu pareja lo verá y
        podrá mandarte ánimos 💪
      </p>
      <label className="mt-1 flex w-full max-w-xs items-center gap-2 text-xs font-semibold">
        Empiezo el
        <input
          type="date"
          value={day}
          max={today}
          onChange={(e) => setDay(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm text-[#1b1216]"
        />
      </label>
      <button
        type="button"
        disabled={pending || !day}
        onClick={() => onStart(day)}
        className="rounded-2xl bg-white px-6 py-3 text-sm font-bold disabled:opacity-60"
        style={{ color: "#0d9488" }}
      >
        {pending ? "Empezando…" : day === today ? "¡Empezar hoy!" : `¡Empezar desde el ${dayLabel(day)}!`}
      </button>
    </div>
  );
}

function StatsGrid({ stats }: { stats: NailStats }) {
  const pct = stats.totalDays > 0 ? Math.round((stats.cleanDays / stats.totalDays) * 100) : 100;
  const items = [
    { emoji: "🏆", value: stats.best, label: stats.best === 1 ? "día, mejor racha" : "días, mejor racha" },
    { emoji: "✅", value: stats.cleanDays, label: `días limpios (${pct} %)` },
    { emoji: "😬", value: stats.biteDays, label: stats.biteDays === 1 ? "día con mordiscos" : "días con mordiscos" },
    { emoji: "💅", value: stats.totalBites, label: stats.totalBites === 1 ? "mordisco en total" : "mordiscos en total" },
  ];
  return (
    <div className="mx-5 grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border p-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          <p className="text-lg">{item.emoji}</p>
          <p className="font-mono-nums text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            {item.value}
          </p>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function Medals({ best }: { best: number }) {
  return (
    <div className="mx-5 rounded-2xl border p-4" style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        Medallas
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {NAIL_MILESTONES.map((m) => {
          const won = best >= m.days;
          return (
            <div key={m.days} className="flex flex-col items-center gap-0.5 text-center" title={m.label}>
              <span className={`text-2xl ${won ? "" : "opacity-25 grayscale"}`}>{m.emoji}</span>
              <span className="text-[10px] font-semibold" style={{ color: won ? "var(--color-ink)" : "var(--color-muted)" }}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Calendario desde que empezó el reto, mes a mes (el más reciente arriba). */
function CalendarCard({
  title,
  startedOn,
  today,
  byDay,
  onPick,
}: {
  title: string;
  startedOn: string;
  today: string;
  byDay: Record<string, number>;
  onPick?: (day: string) => void;
}) {
  const months: string[] = [];
  for (let m = startOfMonth(today); m >= startOfMonth(startedOn); m = startOfMonth(addDays(m, -1))) months.push(m);

  return (
    <div className="mx-5 rounded-2xl border p-4" style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
          {title}
        </p>
        <p className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-muted)" }}>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded" style={{ background: GOOD }} /> limpio
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded" style={{ background: BAD }} /> mordiscos
          </span>
        </p>
      </div>
      {months.map((month) => {
        const offset = weekdayMon0(month);
        const days: string[] = [];
        for (let d = month; d.slice(0, 7) === month.slice(0, 7); d = addDays(d, 1)) days.push(d);
        return (
          <div key={month} className="mt-3">
            <p className="mb-1 text-sm font-semibold capitalize" style={{ color: "var(--color-ink)" }}>
              {monthLabel(month)}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]" style={{ color: "var(--color-muted)" }}>
              {WEEKDAY_LABELS.map((l) => (
                <span key={l}>{l}</span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const inChallenge = day >= startedOn && day <= today;
                const bites = byDay[day] ?? 0;
                const bg = !inChallenge ? "transparent" : bites > 0 ? BAD : GOOD;
                const content = (
                  <>
                    <span className="text-[11px] font-semibold leading-none">{dayNumber(day)}</span>
                    {inChallenge ? (
                      <span className="text-[9px] leading-none">{bites > 0 ? `×${bites}` : "✓"}</span>
                    ) : null}
                  </>
                );
                const style: React.CSSProperties = {
                  background: inChallenge ? `color-mix(in srgb, ${bg} ${bites > 0 ? 85 : 70}%, transparent)` : "transparent",
                  color: inChallenge ? "#ffffff" : "var(--color-muted)",
                  opacity: inChallenge ? 1 : 0.4,
                  boxShadow: day === today ? "0 0 0 2px var(--color-ink)" : undefined,
                };
                return onPick && inChallenge ? (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onPick(day)}
                    aria-label={`${dayLabel(day)}: ${bites > 0 ? `${bites} mordiscos` : "limpio"}`}
                    className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg"
                    style={style}
                  >
                    {content}
                  </button>
                ) : (
                  <span key={day} className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg" style={style}>
                    {content}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChangeStart({
  startedOn,
  today,
  pending,
  onChange,
}: {
  startedOn: string;
  today: string;
  pending: boolean;
  onChange: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(startedOn);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-5 text-center text-xs font-medium underline"
        style={{ color: "var(--color-muted)" }}
      >
        Empezaste el {dayLabel(startedOn)} · cambiar
      </button>
    );
  }
  return (
    <div className="mx-5 flex items-center gap-2">
      <input
        type="date"
        value={day}
        max={today}
        onChange={(e) => setDay(e.target.value)}
        className="flex-1 rounded-xl border px-3 py-2 text-sm"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      />
      <button
        type="button"
        disabled={pending || !day}
        onClick={() => {
          onChange(day);
          setOpen(false);
        }}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        Guardar
      </button>
    </div>
  );
}

/** Hoja de abajo para apuntar los mordiscos de un día. */
function BiteSheet({
  day,
  today,
  startedOn,
  title,
  reportedBy,
  current,
  currentNote,
  pending,
  onDayChange,
  onClose,
  onSave,
}: {
  day: string;
  today: string;
  startedOn: string;
  title: string;
  reportedBy: string | null;
  current: number;
  currentNote: string;
  pending: boolean;
  onDayChange: (day: string) => void;
  onClose: () => void;
  onSave: (count: number, note: string) => void;
}) {
  const [count, setCount] = useState(Math.max(1, current));
  const [note, setNote] = useState(currentNote);
  const yesterday = addDays(today, -1);
  const quickDays = [today, yesterday].filter((d) => d >= startedOn);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apuntar mordiscos"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="sheet-up mx-auto w-full max-w-md rounded-t-3xl border-t p-5"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-line)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-bold" style={{ color: "var(--color-ink)" }}>
            {title}
          </p>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickDays.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDayChange(d)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                background: d === day ? "var(--color-accent)" : "var(--color-bg)",
                borderColor: d === day ? "var(--color-accent)" : "var(--color-line)",
                color: d === day ? "#ffffff" : "var(--color-ink)",
              }}
            >
              {d === today ? "Hoy" : "Ayer"}
            </button>
          ))}
          {!quickDays.includes(day) ? (
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white first-letter:uppercase"
              style={{ background: "var(--color-accent)" }}
            >
              {dayLabel(day)}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            aria-label="Una menos"
            className="flex h-12 w-12 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          >
            <Minus size={20} />
          </button>
          <div className="text-center">
            <p className="font-mono-nums text-5xl font-black" style={{ color: BAD }}>
              {count}
            </p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              {count === 1 ? "vez" : "veces"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(50, c + 1))}
            aria-label="Una más"
            className="flex h-12 w-12 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          >
            <Plus size={20} />
          </button>
        </div>

        {reportedBy ? (
          <p className="mt-3 text-center text-xs" style={{ color: "var(--color-muted)" }}>
            👀 {reportedBy}
          </p>
        ) : null}

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={140}
          placeholder="¿Qué pasó? (opcional): nervios, aburrimiento…"
          className="mt-5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />

        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(count, note)}
          className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: BAD }}
        >
          {pending ? "Guardando…" : current > 0 ? "Guardar" : "Apuntar"}
        </button>
        {current > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onSave(0, "")}
            className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ color: GOOD }}
          >
            ✅ Al final ese día fue limpio
          </button>
        ) : null}
      </div>
    </div>
  );
}
