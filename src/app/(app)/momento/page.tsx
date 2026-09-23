import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { MomentCountdown } from "@/components/features/MomentCountdown";
import { MomentPhotos } from "@/components/features/MomentPhotos";
import { getTodayMoment } from "@/lib/moments/get-moments";
import { MomentCapture } from "./MomentCapture";

export default async function MomentoPage() {
  const moment = await getTodayMoment();

  if (!moment) {
    return (
      <>
        <PageHeader title="Momento Ratta" backHref="/inicio" />
        <p className="mx-5 mt-5 text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      </>
    );
  }

  const { mine, partner, partnerPosted, partnerName, notifiedAt } = moment;
  const card = {
    background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))",
    borderColor: "color-mix(in srgb, var(--color-accent) 20%, var(--color-line))",
  };

  return (
    <>
      <PageHeader title="Momento Ratta" subtitle="Una foto al día, de lo que estáis haciendo 📸" backHref="/inicio" />
      <div className="mt-5 flex flex-col gap-4 px-5">
        {!notifiedAt ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border p-6 text-center" style={card}>
            <span className="text-4xl">⏳</span>
            <p className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              Hoy aún no ha sonado
            </p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Os llegará un aviso a los dos a la vez, en cualquier momento entre las 10:00 y las 22:00. Entonces
              tendréis 10 minutos para hacer la foto. 👀
            </p>
          </div>
        ) : mine ? (
          <div className="flex flex-col gap-3 rounded-2xl border p-4" style={card}>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              El Momento de hoy
            </p>
            <MomentPhotos
              photos={[mine, ...(partner ? [partner] : [])]}
              names={moment.names}
              slots={partner ? [] : [{ key: "partner", label: "⏳", hint: `${partnerName} aún no ha subido el suyo` }]}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border p-4" style={card}>
            <p className="text-center text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
              📸 ¡Es la hora!
            </p>
            <p className="text-center text-sm" style={{ color: "var(--color-accent)" }}>
              <MomentCountdown notifiedAt={notifiedAt} />
            </p>
            {partnerPosted ? (
              <p
                className="rounded-xl px-3 py-2 text-center text-sm"
                style={{ background: "var(--color-surface)", color: "var(--color-muted)" }}
              >
                🔒 {partnerName} ya ha subido el suyo. Sube el tuyo para verlo.
              </p>
            ) : null}
            <MomentCapture spaceId={moment.spaceId} />
          </div>
        )}

        <Link
          href="/calendario?view=month"
          className="text-center text-sm font-medium"
          style={{ color: "var(--color-accent-2)" }}
        >
          Ver los Momentos de otros días en el calendario →
        </Link>
      </div>
    </>
  );
}
