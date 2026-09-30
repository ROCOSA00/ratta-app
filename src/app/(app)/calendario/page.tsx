import { PageHeader } from "@/components/shared/PageHeader";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { dayLabel, monthGridKeys, todayKey, weekKeys } from "@/lib/calendar/date-utils";
import { getEventsInRange, getUpcomingEvents, type EventRow } from "@/lib/events/load";
import { EventList } from "./EventList";
import { NewEventForm } from "./NewEventForm";
import { ViewToggle } from "./ViewToggle";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { MomentPhotos } from "@/components/features/MomentPhotos";
import { getMomentDaysInRange, getMomentForDay, type MomentPhoto } from "@/lib/moments/get-moments";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; ref?: string }>;
}) {
  const params = await searchParams;
  // Por defecto, el mes.
  const view = params.view === "list" || params.view === "week" ? params.view : "month";
  const refKey = params.ref && DATE_KEY_RE.test(params.ref) ? params.ref : todayKey();

  const spaceId = await getCurrentSpaceId();
  let events: EventRow[] = [];
  let momentDays = new Set<string>();
  let dayMoment: { photos: MomentPhoto[]; names: Record<string, string> } | null = null;

  if (spaceId) {
    if (view === "list") {
      events = await getUpcomingEvents(spaceId);
    } else {
      const keys = view === "month" ? monthGridKeys(refKey) : weekKeys(refKey);
      // monthGridKeys()/weekKeys() siempre devuelven arrays no vacíos (42 y 7 keys).
      const from = keys[0]!;
      const to = keys[keys.length - 1]!;
      // Los planes y los Momentos del mes se piden a la vez, no uno tras otro.
      const [inRange, moments] = await Promise.all([
        getEventsInRange(spaceId, from, to),
        view === "month"
          ? Promise.all([getMomentDaysInRange(spaceId, from, to), getMomentForDay(spaceId, refKey)])
          : null,
      ]);
      events = inRange;
      if (moments) [momentDays, dayMoment] = moments;
    }
  }

  const selectedDayEvents = events.filter((e) => e.day === refKey);

  return (
    <>
      <PageHeader title="Calendario" subtitle="Vuestros planes, en un solo sitio" />
      <div className="mt-4 flex flex-col gap-4">
        <div data-tour="cal-views">
          <ViewToggle view={view} refKey={refKey} />
        </div>

        {view === "month" ? (
          <>
            <MonthView refKey={refKey} events={events} momentDays={momentDays} />
            {dayMoment && dayMoment.photos.length > 0 ? (
              <div className="mx-5">
                <p
                  className="mb-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  📸 Momento Ratta
                </p>
                <MomentPhotos photos={dayMoment.photos} names={dayMoment.names} />
              </div>
            ) : null}
            <div>
              <p className="mx-5 mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                {dayLabel(refKey)}
                {refKey === todayKey() ? " · hoy" : ""}
              </p>
              <EventList events={selectedDayEvents} emptyMessage="Sin planes este día." />
            </div>
          </>
        ) : null}

        {view === "week" ? <WeekView refKey={refKey} events={events} /> : null}

        {view === "list" ? <EventList events={events} /> : null}

        <div className="px-5">
          <div data-tour="cal-new">
            <NewEventForm />
          </div>
        </div>
      </div>
    </>
  );
}
