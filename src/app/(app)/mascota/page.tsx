import { PageHeader } from "@/components/shared/PageHeader";
import { getPetDetail, getPets } from "@/lib/pets/get-pet";
import { todayKey } from "@/lib/calendar/date-utils";
import { PetView } from "./PetView";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function MascotaPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const pets = await getPets();
  const chosen = pets.find((p) => p.id === id && UUID_RE.test(id)) ?? pets[0];
  const detail = chosen ? await getPetDetail(chosen.id) : null;

  return (
    <>
      <PageHeader
        title={chosen ? `${chosen.name} ${chosen.emoji}` : "Mascota"}
        subtitle="Nuestro hijito peludo"
        backHref="/inicio"
      />
      {detail ? (
        <PetView
          spaceId={detail.spaceId}
          pet={detail.pet}
          weights={detail.weights}
          events={detail.events}
          photos={detail.photos}
          today={todayKey()}
        />
      ) : (
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          Todavía no hay ninguna mascota.
        </p>
      )}
    </>
  );
}
