import Link from "next/link";
import type { TodayMoment } from "@/lib/moments/get-moments";
import { MomentCountdown } from "./MomentCountdown";

/** Aviso en Inicio mientras el Momento de hoy ha sonado y aún no has subido el tuyo. */
export function MomentBanner({ moment }: { moment: TodayMoment | null }) {
  if (!moment?.notifiedAt || moment.mine) return null;

  return (
    <Link
      href="/momento"
      className="mx-5 flex items-center gap-3 rounded-2xl p-4 text-white shadow-lg"
      style={{ backgroundImage: "var(--color-gradient)" }}
    >
      <span className="text-3xl">📸</span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold">¡Es la hora del Momento Ratta!</p>
        <p className="text-sm opacity-90">
          <MomentCountdown notifiedAt={moment.notifiedAt} />
        </p>
        {moment.partnerPosted ? (
          <p className="mt-0.5 text-xs opacity-90">{moment.partnerName} ya ha subido el suyo 👀</p>
        ) : null}
      </div>
      <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">Hacer foto</span>
    </Link>
  );
}
