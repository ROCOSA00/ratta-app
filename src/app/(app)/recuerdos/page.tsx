import Link from "next/link";
import Image from "next/image";
import { Images } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { getMemories } from "@/lib/memories/get-memories";
import { MemoryUpload } from "./MemoryUpload";

export default async function RecuerdosPage() {
  const { spaceId, memories } = await getMemories();

  return (
    <>
      <PageHeader title="Recuerdos" subtitle="Vuestras fotos juntos" backHref="/inicio" />
      <div className="mt-5 flex flex-col gap-5 pb-4">
        {spaceId ? <MemoryUpload spaceId={spaceId} /> : null}

        {memories.length === 0 ? (
          <div
            className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
          >
            <Images size={26} style={{ color: "var(--color-muted)" }} />
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Todavía no hay recuerdos. Sube vuestra primera foto juntos. 📸
            </p>
          </div>
        ) : (
          <>
            <p className="mx-5 text-xs" style={{ color: "var(--color-muted)" }}>
              {memories.length === 1 ? "1 recuerdo" : `${memories.length} recuerdos`} · solo los veis vosotros dos 🔒
            </p>
            <ul className="mx-5 grid grid-cols-3 gap-1.5">
              {memories.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/recuerdos/${m.id}`}
                    className="relative block aspect-square overflow-hidden rounded-xl"
                    style={{ background: "var(--color-line)" }}
                  >
                    {m.url ? (
                      <Image
                        src={m.url}
                        alt={m.caption ?? "Recuerdo"}
                        fill
                        unoptimized
                        sizes="33vw"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
