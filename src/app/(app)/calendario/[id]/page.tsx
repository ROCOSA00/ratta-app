import Link from "next/link";
import { CalendarDays, MapPin, Pencil, Repeat } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDeleteBar } from "@/components/shared/ConfirmDeleteBar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getEvent } from "@/lib/events/get-event";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { todayKey } from "@/lib/calendar/date-utils";
import { LOVE_COLOR } from "@/lib/events/load";
import { isRecurring, recurrenceLabel } from "@/lib/events/recurrence";
import { loveDayLabel } from "@/lib/couple";
import { ReminderToggle } from "./ReminderToggle";
import { SkipOccurrenceButton, SkippedDays } from "./SkipButtons";
import { deleteEvent } from "../actions";
import { EventPhotos } from "./EventPhotos";
import { getAuthUser } from "@/lib/auth/get-user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function EventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** day: qué vez del plan, si se repite. */
  searchParams: Promise<{ day?: string }>;
}) {
  const [{ id }, { day }] = await Promise.all([params, searchParams]);
  const requestedDay = day && DATE_KEY_RE.test(day) ? day : null;
  const [event, spaceId] = await Promise.all([
    UUID_RE.test(id) ? getEvent(id, requestedDay) : null,
    getCurrentSpaceId(),
  ]);

  if (!event || !spaceId) {
    return (
      <>
        <PageHeader title="Plan no encontrado" backHref="/calendario" />
        <p className="mx-5 mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Puede que ya lo hayáis borrado.{" "}
          <Link href="/calendario" style={{ color: "var(--color-accent)" }}>
            Volver al calendario
          </Link>
        </p>
      </>
    );
  }

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: profiles },
  ] = await Promise.all([getAuthUser(), supabase.from("profiles").select("id, display_name")]);
  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    names[p.id] = p.id === user?.id ? "Tú" : (p.display_name ?? "Tu pareja");
  }

  const eventDay = event.day;
  const canAddPhotos = eventDay <= todayKey();
  const isLove = event.color === LOVE_COLOR;
  const repeats = recurrenceLabel(event);

  return (
    <>
      <PageHeader title={event.title} backHref={`/calendario?view=month&ref=${eventDay}`} />
      <div className="mt-4 flex flex-col gap-4 pb-4">
        {isLove ? (
          <div
            className="love-day relative mx-5 overflow-hidden rounded-2xl p-5 text-white"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <span aria-hidden className="love-day-hearts" />
            <p className="relative text-3xl">💞</p>
            <p className="relative mt-2 text-lg font-black leading-tight tracking-wide">{event.title}</p>
            <p className="relative mt-1 text-sm font-semibold opacity-95">
              {formatDate(event.start_at)} · todo el día
            </p>
            <p className="relative mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              {loveDayLabel(event.day, event.first_day)}
            </p>
            {event.description ? <p className="relative mt-3 text-sm opacity-95">{event.description}</p> : null}
          </div>
        ) : (
          <div
            className="mx-5 flex flex-col gap-1.5 rounded-2xl border p-4"
            style={{
              background: "color-mix(in srgb, var(--color-accent-2) 6%, var(--color-surface))",
              borderColor: "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-line))",
            }}
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--color-accent-2)" }}>
              <CalendarDays size={15} />
              {event.all_day ? `${formatDate(event.start_at)} · todo el día` : formatDateTime(event.start_at)}
            </p>
            {repeats ? (
              <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
                <Repeat size={15} />
                {repeats}
              </p>
            ) : null}
            {event.location ? (
              <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
                <MapPin size={15} />
                {event.location}
              </p>
            ) : null}
            {event.description ? (
              <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "var(--color-ink)" }}>
                {event.description}
              </p>
            ) : null}
          </div>
        )}

        {isLove ? null : (
          <div className="mx-5 flex gap-2">
            <Link
              href={`/calendario/${event.id}/editar`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink)", background: "var(--color-surface)" }}
            >
              <Pencil size={15} />
              Editar
            </Link>
            {repeats ? <SkipOccurrenceButton eventId={event.id} day={eventDay} title={event.title} /> : null}
          </div>
        )}

        <ReminderToggle eventId={event.id} on={event.remind_day_before} recurring={isRecurring(event)} />

        {repeats ? (
          <SkippedDays eventId={event.id} days={event.skipped_days.filter((d) => d >= todayKey())} />
        ) : null}

        <EventPhotos
          key={eventDay}
          eventId={event.id}
          day={isRecurring(event) ? eventDay : undefined}
          spaceId={spaceId}
          photos={event.photos}
          names={names}
          canAdd={canAddPhotos}
        />

        {/* El de cada día 6 no se puede borrar: es vuestro día. */}
        {isLove ? null : (
          <form action={deleteEvent} className="mx-5">
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="redirect" value="1" />
            <ConfirmDeleteBar
              label={repeats ? "Borrar plan (todas las veces)" : "Borrar plan"}
              confirmMessage={
                repeats
                  ? `¿Borrar "${event.title}", todas sus repeticiones y sus fotos? No se puede deshacer.`
                  : `¿Borrar "${event.title}"${event.photos.length > 0 ? " y sus fotos" : ""}? No se puede deshacer.`
              }
            />
          </form>
        )}
      </div>
    </>
  );
}
