import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { getEvent } from "@/lib/events/get-event";
import { LOVE_COLOR } from "@/lib/events/load";
import { TIME_ZONE } from "@/lib/format-date";
import { EventForm, type EventFormValues } from "../../NewEventForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const wallClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default async function EditarPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = UUID_RE.test(id) ? await getEvent(id) : null;

  if (!event || event.color === LOVE_COLOR) {
    return (
      <>
        <PageHeader title="No se puede editar" backHref={event ? `/calendario/${id}` : "/calendario"} />
        <p className="mx-5 mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          {event ? "Vuestro día 6 no se cambia 💞" : "Puede que ya lo hayáis borrado."}{" "}
          <Link href="/calendario" style={{ color: "var(--color-accent)" }}>
            Volver al calendario
          </Link>
        </p>
      </>
    );
  }

  // Se edita el plan entero: la fecha es la de la primera vez.
  const initial: EventFormValues = {
    eventId: event.id,
    title: event.title,
    date: event.first_day,
    time: event.all_day ? "" : wallClock.format(new Date(event.start_at)),
    allDay: event.all_day,
    repeat: event.recurrence,
    until: event.recurrence_until ?? "",
    remind: event.remind_day_before,
    location: event.location ?? "",
    description: event.description ?? "",
  };

  return (
    <>
      <PageHeader title="Editar plan" backHref={`/calendario/${event.id}`} />
      <div className="mt-4 flex flex-col gap-3 pb-4">
        {event.recurrence !== "none" ? (
          <p className="mx-5 text-xs" style={{ color: "var(--color-muted)" }}>
            Los cambios se aplican a todas las veces del plan. Para quitar solo un día, usa «Esta vez no» en el plan.
          </p>
        ) : null}
        <EventForm initial={initial} />
      </div>
    </>
  );
}
