import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { CalendarDays } from "lucide-react";

export default function CalendarioPage() {
  return (
    <>
      <PageHeader title="Calendario" subtitle="Vuestros planes, en un solo sitio" />
      <div className="mt-5">
        <ComingSoon
          icon={CalendarDays}
          title="El calendario compartido llega en la Fase 6"
          description="Crear, editar y eliminar eventos, categorías, vistas de mes/semana/agenda y eventos destacados."
          phase="Fase 6 · Calendario"
        />
      </div>
    </>
  );
}
