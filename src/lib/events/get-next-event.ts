import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getUpcomingEvents, type EventRow } from "./load";

export type NextEvent = EventRow;

/** El próximo plan (si se repite, su siguiente vez). */
export async function getNextEvent(): Promise<NextEvent | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;
  const [next] = await getUpcomingEvents(spaceId, 1);
  return next ?? null;
}
