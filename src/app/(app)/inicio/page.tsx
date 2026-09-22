import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { LayoutDashboard } from "lucide-react";

export default function InicioPage() {
  return (
    <>
      <PageHeader title="Hola 👋" subtitle="Nuestro pequeño mundo para dos" />
      <div className="mt-5">
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
