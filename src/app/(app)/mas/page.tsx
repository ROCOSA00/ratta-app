import { PageHeader } from "@/components/shared/PageHeader";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { HelpCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

export default async function MasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader title="Más" subtitle="Pregunta del día y ajustes" />

      <div
        className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-2xl border p-4"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <p className="truncate text-sm" style={{ color: "var(--color-ink)" }}>
          {user?.email}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              color: "var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 12%, var(--color-surface))",
            }}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </form>
      </div>

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
