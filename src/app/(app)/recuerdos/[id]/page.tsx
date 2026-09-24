import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDeleteBar } from "@/components/shared/ConfirmDeleteBar";
import { createClient } from "@/lib/supabase/server";
import { getMemory } from "@/lib/memories/get-memories";
import { deleteMemory } from "@/lib/memories/actions";
import { formatDate } from "@/lib/format-date";
import { getAuthUser } from "@/lib/auth/get-user";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function RecuerdoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = UUID_RE.test(id) ? await getMemory(id) : null;

  if (!memory) {
    return (
      <>
        <PageHeader title="Recuerdo no encontrado" backHref="/recuerdos" />
        <p className="mx-5 mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Puede que ya lo hayáis borrado.{" "}
          <Link href="/recuerdos" style={{ color: "var(--color-accent)" }}>
            Volver a recuerdos
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
    { data: uploader },
  ] = await Promise.all([
    getAuthUser(),
    supabase.from("profiles").select("display_name").eq("id", memory.uploaded_by).maybeSingle(),
  ]);
  const isMine = user?.id === memory.uploaded_by;
  const when = memory.taken_on ? formatDate(`${memory.taken_on}T12:00:00Z`) : formatDate(memory.created_at);

  return (
    <>
      <PageHeader title="Recuerdo" backHref="/recuerdos" />
      <div className="mt-4 flex flex-col gap-4 pb-4">
        <div className="relative mx-5 aspect-[4/5] overflow-hidden rounded-2xl" style={{ background: "var(--color-line)" }}>
          {memory.url ? (
            <Image src={memory.url} alt={memory.caption ?? "Recuerdo"} fill unoptimized className="object-cover" />
          ) : null}
        </div>

        <div className="mx-5">
          {memory.caption ? (
            <p className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              {memory.caption}
            </p>
          ) : null}
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
            {when}
            {uploader?.display_name ? ` · subida por ${isMine ? "ti" : uploader.display_name}` : ""}
          </p>
        </div>

        {isMine ? (
          <form action={deleteMemory} className="mx-5">
            <input type="hidden" name="memoryId" value={memory.id} />
            <ConfirmDeleteBar label="Borrar recuerdo" confirmMessage="¿Borrar esta foto? No se puede deshacer." />
          </form>
        ) : null}
      </div>
    </>
  );
}
