import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { EventList, type EventRow } from "./EventList";
import { NewEventForm } from "./NewEventForm";

export default async function CalendarioPage() {
  const spaceId = await getCurrentSpaceId();

  let events: EventRow[] = [];

  if (spaceId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select("id, title, start_at, all_day, location, description")
      .eq("space_id", spaceId)
      .gte("end_at", new Date().toISOString())
      .order("start_at", { ascending: true });

    events = data ?? [];
  }

  return (
    <>
      <PageHeader title="Calendario" subtitle="Vuestros planes, en un solo sitio" />
      <div className="mt-5 flex flex-col gap-5">
        <NewEventForm />
        <EventList events={events} />
      </div>
    </>
  );
}
