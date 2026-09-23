import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { computeStats, type PoopEntry } from "./stats";
import { LogButton } from "./LogButton";
import { StatsCard } from "./StatsCard";

export default async function JuegosPage() {
  const spaceId = await getCurrentSpaceId();

  if (!spaceId) {
    return (
      <>
        <PageHeader title="Juegos" subtitle="El Trono y algo más" />
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      </>
    );
  }

  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: members },
    { data: entries },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("space_members").select("user_id").eq("space_id", spaceId),
    supabase.from("poop_entries").select("user_id, logged_at").eq("space_id", spaceId),
  ]);

  const userIds = (members ?? []).map((m) => m.user_id as string);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const displayNameById = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id as string, p.display_name as string]),
  );

  const stats = computeStats((entries ?? []) as PoopEntry[], userIds);

  const currentUserId = user?.id ?? "";
  const orderedIds = [...userIds].sort((a, b) => {
    if (a === currentUserId) return -1;
    if (b === currentUserId) return 1;
    return 0;
  });

  let comparison: string | null = null;
  if (orderedIds.length === 2) {
    const [meId, partnerId] = orderedIds as [string, string];
    const meTotal = stats[meId]?.total ?? 0;
    const partnerTotal = stats[partnerId]?.total ?? 0;
    if (meTotal === partnerTotal) {
      comparison = "Empate técnico ⚖️";
    } else {
      const leader = meTotal > partnerTotal ? "Tú" : (displayNameById.get(partnerId) ?? "Tu pareja");
      comparison = `Ahora mismo va ganando: ${leader} 🏆`;
    }
  }

  return (
    <>
      <PageHeader title="Juegos" subtitle="El Trono y algo más" />
      <div className="mt-5 flex flex-col gap-5">
        <LogButton />

        {comparison ? (
          <p className="mx-5 text-center text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            {comparison}
          </p>
        ) : null}

        <div className="mx-5 grid grid-cols-2 gap-3">
          {orderedIds.map((id) => (
            <StatsCard
              key={id}
              name={id === currentUserId ? "Tú" : (displayNameById.get(id) ?? "Compañero/a")}
              stats={stats[id]}
            />
          ))}
        </div>
      </div>
    </>
  );
}
