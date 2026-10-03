import { PageHeader } from "@/components/shared/PageHeader";
import { getNails } from "@/lib/nails/get-nails";
import { todayKey } from "@/lib/calendar/date-utils";
import { NailChallenge } from "./NailChallenge";

export default async function UnasPage() {
  const nails = await getNails();

  return (
    <>
      <PageHeader title="Reto de las uñas 💅" subtitle="Días sin morderte las uñas" backHref="/juegos" />
      {nails ? (
        <NailChallenge me={nails.me} partner={nails.partner} today={todayKey()} />
      ) : (
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      )}
    </>
  );
}
