import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { NotebookPen } from "lucide-react";

export default function NotasPage() {
  return (
    <>
      <PageHeader title="Notas" subtitle="Ideas, listas y recordatorios" />
      <div className="mt-5">
        <ComingSoon
          icon={NotebookPen}
          title="Las notas llegan en la Fase 7"
          description="Crear, fijar, archivar y organizar por categorías, con checklists y listas de la compra."
          phase="Fase 7 · Notas"
        />
      </div>
    </>
  );
}
