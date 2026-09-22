import { ComingSoon } from "@/components/shared/ComingSoon";
import { RattaLogo } from "@/components/shared/RattaLogo";
import { SupabaseStatus } from "@/components/shared/SupabaseStatus";
import { LayoutDashboard } from "lucide-react";

export default function InicioPage() {
  return (
    <>
      <header
        className="px-5 pb-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)" }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className="flex h-28 w-28 items-center justify-center rounded-[26%] p-5 shadow-lg"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <RattaLogo className="h-full w-full text-white" />
          </span>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold" style={{ color: "var(--color-ink)" }}>
              Ratta
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Nuestro pequeño mundo para dos.
            </p>
          </div>
        </div>
      </header>

      <SupabaseStatus />

      <div className="mt-1">
        <ComingSoon
          icon={LayoutDashboard}
          title="El panel llega en la Fase 10"
          description="Aquí verás el próximo evento, la pregunta del día, el contador de El Trono, tu nota fijada y vuestra racha."
          phase="Fase 10 · Dashboard"
        />
      </div>
    </>
  );
}
