import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { HelpCircle } from "lucide-react";

export default function MasPage() {
  return (
    <>
      <PageHeader title="Más" subtitle="Pregunta del día y ajustes" />
      <div className="mt-5">
        <ComingSoon
          icon={HelpCircle}
          title="La pregunta del día llega en la Fase 9"
          description="Responded cada uno por separado; las respuestas se revelan solo cuando ambos hayáis contestado."
          phase="Fase 9 · Pregunta del día"
        />
      </div>
    </>
  );
}
