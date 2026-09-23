import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDeleteBar } from "@/components/shared/ConfirmDeleteBar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getEvent } from "@/lib/events/get-event";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { todayKey, toDateKey } from "@/lib/calendar/date-utils";
import { deleteEvent } from "../actions";
import { EventPhotos } from "./EventPhotos";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, spaceId] = await Promise.all([UUID_RE.test(id) ? getEvent(id) : null, getCurrentSpaceId()]);

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
  ] = await Promise.all([supabase.auth.getUser(), supabase.from("profiles").select("id, display_name")]);
  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    names[p.id] = p.id === user?.id ? "Tú" : (p.display_name ?? "Tu pareja");
  }

  const eventDay = toDateKey(new Date(event.start_at));
  const canAddPhotos = eventDay <= todayKey();

  return (
    <>
      <PageHeader title={event.title} backHref={`/calendario?view=month&ref=${eventDay}`} />
      <div className="mt-4 flex flex-col gap-4 pb-4">
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

        <EventPhotos
          eventId={event.id}
          spaceId={spaceId}
          photos={event.photos}
          names={names}
          canAdd={canAddPhotos}
        />

        <form action={deleteEvent} className="mx-5">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="redirect" value="1" />
          <ConfirmDeleteBar
            label="Borrar plan"
            confirmMessage={`¿Borrar "${event.title}"${event.photos.length > 0 ? " y sus fotos" : ""}? No se puede deshacer.`}
          />
        </form>
      </div>
    </>
  );
}
