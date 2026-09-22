import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { Sparkles } from "lucide-react";

export default function JuegosPage() {
  return (
    <>
      <PageHeader title="Juegos" subtitle="El Trono y algo más" />
      <div className="mt-5">
        <ComingSoon
          icon={Sparkles}
          title="El Trono llega en la Fase 8"
          description="El contador +1, estadísticas de hoy/semana/mes/año, comparativas entre los dos, rachas y logros humorísticos."
          phase="Fase 8 · El Trono"
        />
      </div>
    </>
  );
}
