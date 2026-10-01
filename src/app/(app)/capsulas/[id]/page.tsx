import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDeleteBar } from "@/components/shared/ConfirmDeleteBar";
import { getCapsule } from "@/lib/capsules/get-capsules";
import { deleteCapsule } from "@/lib/capsules/actions";
import { countdownLabel, shortDate } from "@/lib/capsules/config";
import { todayKey, toDateKey } from "@/lib/calendar/date-utils";
import { CapsuleLetter } from "./CapsuleLetter";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function CapsulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = UUID_RE.test(id) ? await getCapsule(id) : null;

  if (!found) {
    return (
      <>
        <PageHeader title="Carta no encontrada" backHref="/capsulas" />
        <p className="mx-5 mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Puede que ya no exista.{" "}
          <Link href="/capsulas" style={{ color: "var(--color-accent)" }}>
            Volver a las cápsulas
          </Link>
        </p>
      </>
    );
  }

  const { capsule, content } = found;
  const writtenOn = shortDate(toDateKey(new Date(capsule.created_at)));

  return (
    <>
      <PageHeader
        title={capsule.mine ? "Tu carta" : `Carta de ${capsule.authorName}`}
        subtitle={`Escrita el ${writtenOn}`}
        backHref="/capsulas"
      />
      <div className="mt-5 flex flex-col gap-5 pb-4">
        {content ? (
          <CapsuleLetter
            capsuleId={capsule.id}
            title={content.title}
            body={content.body}
            photoUrl={content.photoUrl}
            author={capsule.mine ? "Tú" : capsule.authorName}
            writtenOn={writtenOn}
            // Sobre cerrado con «Abrir» solo para quien la recibe, la primera vez.
            sealed={!capsule.mine && !capsule.opened_at}
            notice={
              capsule.mine && !capsule.ready
                ? `🔒 Tu pareja podrá leerla el ${shortDate(capsule.open_on)}. Tú puedes releerla cuando quieras.`
                : null
            }
          />
        ) : (
          // Aún cerrada: la base de datos no da el contenido hasta el día.
          <div className="mx-5 flex flex-col items-center gap-4 text-center">
            <div className="capsule-envelope capsule-float" aria-hidden>
              <span className="capsule-flap" />
              <span className="capsule-seal">🔒</span>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
                {countdownLabel(capsule.open_on, todayKey())}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                {capsule.authorName} te escribió esta carta. Se abrirá el {shortDate(capsule.open_on)} y os llegará un
                aviso ese día.
              </p>
            </div>
            {capsule.hint ? (
              <p
                className="rounded-2xl border px-4 py-3 text-sm italic"
                style={{
                  background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))",
                  borderColor: "color-mix(in srgb, var(--color-accent) 18%, var(--color-line))",
                  color: "var(--color-ink)",
                }}
              >
                Pista: «{capsule.hint}»
              </p>
            ) : null}
          </div>
        )}

        {capsule.mine ? (
          <form action={deleteCapsule} className="mx-5">
            <input type="hidden" name="capsuleId" value={capsule.id} />
            <ConfirmDeleteBar label="Borrar carta" confirmMessage="¿Borrar esta carta? No se puede deshacer." />
          </form>
        ) : null}
      </div>
    </>
  );
}
