import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { addDays, dayLabel, monthGridKeys, todayKey, toDateKey, weekKeys } from "@/lib/calendar/date-utils";
import { EventList, type EventRow } from "./EventList";
import { NewEventForm } from "./NewEventForm";
import { ViewToggle } from "./ViewToggle";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { MomentPhotos } from "@/components/features/MomentPhotos";
import { getMomentDaysInRange, getMomentForDay, type MomentPhoto } from "@/lib/moments/get-moments";

// event_photos(count): cuántas fotos tiene cada plan, en la misma consulta.
const EVENT_COLUMNS = "id, title, start_at, end_at, all_day, location, description, event_photos(count)";

type EventQueryRow = Omit<EventRow, "photo_count"> & { event_photos: { count: number }[] | null };

function toEventRows(data: unknown): EventRow[] {
  return ((data ?? []) as EventQueryRow[]).map(({ event_photos, ...rest }) => ({
    ...rest,
    photo_count: event_photos?.[0]?.count ?? 0,
  }));
}
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "month" || params.view === "week" ? params.view : "list";
  const refKey = params.ref && DATE_KEY_RE.test(params.ref) ? params.ref : todayKey();

  const spaceId = await getCurrentSpaceId();
  let events: EventRow[] = [];
  let momentDays = new Set<string>();
  let dayMoment: { photos: MomentPhoto[]; names: Record<string, string> } | null = null;

  if (spaceId) {
    const supabase = await createClient();

    if (view === "list") {
      const { data } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("space_id", spaceId)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true });
      events = toEventRows(data);
    } else {
      // Mes/semana: traemos un rango con un día de margen a cada lado
      // (por si el huso horario mueve un evento a la key vecina) y
      // luego agrupamos con precisión por día ya en hora de Madrid.
      const keys = view === "month" ? monthGridKeys(refKey) : weekKeys(refKey);
      // monthGridKeys()/weekKeys() siempre devuelven arrays no vacíos (42 y 7 keys).
      const rangeStart = addDays(keys[0]!, -1);
      const rangeEnd = addDays(keys[keys.length - 1]!, 2);
      const { data } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("space_id", spaceId)
        .gte("end_at", `${rangeStart}T00:00:00.000Z`)
        .lt("start_at", `${rangeEnd}T00:00:00.000Z`)
        .order("start_at", { ascending: true });
      events = toEventRows(data);

      if (view === "month") {
        [momentDays, dayMoment] = await Promise.all([
          getMomentDaysInRange(spaceId, keys[0]!, keys[keys.length - 1]!),
          getMomentForDay(spaceId, refKey),
        ]);
      }
    }
  }

  const selectedDayEvents = events.filter((e) => toDateKey(new Date(e.start_at)) === refKey);

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
