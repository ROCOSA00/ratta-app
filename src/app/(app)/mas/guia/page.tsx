import type { ComponentType, ReactNode } from "react";
import {
  CalendarDays,
  Crown,
  Heart,
  Home,
  MessageCircleQuestion,
  NotebookPen,
  Settings,
  Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MarkGuideSeen } from "@/components/features/GuideWelcome";

function Section({
  icon: Icon,
  tint,
  title,
  children,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tint: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="mx-5 rounded-2xl border p-4"
      style={{
        background: `color-mix(in srgb, ${tint} 7%, var(--color-surface))`,
        borderColor: `color-mix(in srgb, ${tint} 20%, var(--color-line))`,
      }}
    >
      <h2 className="flex items-center gap-2 text-base" style={{ color: "var(--color-ink)" }}>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`, color: tint }}
        >
          <Icon size={16} strokeWidth={2.3} />
        </span>
        {title}
      </h2>
      <div className="mt-2.5 space-y-2 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {children}
      </div>
    </section>
  );
}

function B({ children }: { children: ReactNode }) {
  return <b style={{ color: "var(--color-ink)" }}>{children}</b>;
}

const BADGES: [string, string][] = [
  ["🎉 Primera vez", "tu primer registro"],
  ["💩 Debutante", "10 registros"],
  ["🚽 Asiduo/a", "50 registros"],
  ["👑 Realeza del Trono", "100 registros"],
  ["🔥 En racha", "3 días seguidos"],
  ["🔥🔥 Una semana entera", "7 días seguidos"],
  ["🏅 Un mes sin fallar", "30 días seguidos"],
  ["✌️ Doblete / ⚡ Triplete", "2 o 3 en un mismo día"],
  ["🌅 Madrugador/a", "uno entre las 5 y las 7 de la mañana"],
  ["🦉 Noctámbulo/a", "uno entre las 12 y las 5 de la madrugada"],
];

export default function GuiaPage() {
  return (
    <>
      <MarkGuideSeen />
      <PageHeader title="Cómo funciona Ratta" subtitle="Una vuelta rápida por todo" backHref="/mas" />

      <div className="mt-5 flex flex-col gap-4 pb-4">
        <p className="mx-5 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Ratta es vuestro rincón privado: solo existen dos cuentas, la tuya y la de tu pareja, y nadie
          más puede ver nada de lo que hay dentro. 💞
        </p>

        <Section icon={Smartphone} tint="var(--color-accent-2)" title="Tenla como una app">
          <p>
            En Safari, toca <B>Compartir</B> (el cuadrado con la flecha hacia arriba) y luego{" "}
            <B>Añadir a pantalla de inicio</B>. Te aparece el icono de Ratta y se abre a pantalla completa,
            como cualquier otra app.
          </p>
        </Section>

        <Section icon={Home} tint="var(--color-accent)" title="Inicio">
          <p>Tu resumen de un vistazo, en cuanto abres la app:</p>
          <p>
            • <B>Días juntos</B> desde el 6 de marzo de 2026. Cada mes, cada año y cada 100 días hay
            celebración. 🎉
          </p>
          <p>
            • <B>Próximo plan</B> del calendario, con cuántos días faltan.
          </p>
          <p>
            • <B>Pregunta del día</B>, <B>Cariño</B>, <B>El Trono</B> y tu <B>nota fijada</B>, para usarlos
            sin cambiar de pestaña.
          </p>
        </Section>

        <Section icon={MessageCircleQuestion} tint="var(--color-accent)" title="Pregunta del día">
          <p>
            Cada día sale una pregunta nueva para los dos. Tú respondes la tuya, y la respuesta de tu pareja{" "}
            <B>solo se desbloquea cuando los dos hayáis contestado</B>. Así nadie se copia. 😉
          </p>
        </Section>

        <Section icon={Heart} tint="var(--color-accent)" title="Cariño">
          <p>
            Un toque y le mandas un mensajito: 🥰 <B>Te quiero</B>, 🥺 <B>Te echo de menos</B>, 💭{" "}
            <B>Pienso en ti</B> o 🌙 <B>Buenas noches</B>. Le aparece a tu pareja en Inicio.
          </p>
        </Section>

        <Section icon={CalendarDays} tint="var(--color-accent-2)" title="Calendario">
          <p>
            Vuestros planes en tres vistas: <B>Lista</B> (lo próximo), <B>Mes</B> (con un puntito en los días
            con algo; toca un día para verlo) y <B>Semana</B>.
          </p>
          <p>
            Para añadir un plan: título, fecha y hora (o <B>Todo el día</B>), y si quieres, ubicación y notas.
            La papelera 🗑️ lo borra.
          </p>
        </Section>

        <Section icon={NotebookPen} tint="var(--color-accent-2)" title="Notas">
          <p>
            Dos tipos: <B>Texto</B> para escribir lo que sea, y <B>Lista</B> con casillas para ir marcando
            (la compra, planes, pelis pendientes…).
          </p>
          <p>
            Toca una nota para abrirla entera y editarla. La chincheta 📌 la fija arriba y en Inicio, y el
            buscador encuentra cualquier nota por su texto.
          </p>
        </Section>

        <Section icon={Crown} tint="var(--color-gold)" title="El Trono">
          <p>
            El juego más serio de la app. 👑 Cada vez que vayas al baño, toca el botón <B>+</B> (en Juegos o en
            Inicio). Si le das sin querer, tienes unos segundos para darle a <B>Deshacer</B>.
          </p>
          <p>
            Compara con tu pareja cuántas llevas hoy, esta semana, el mes y el año, vuestras rachas, el récord
            en un día y la gráfica de la última semana.
          </p>
          <p>Y hay logros por desbloquear:</p>
          <ul className="space-y-1">
            {BADGES.map(([badge, how]) => (
              <li key={badge} className="flex items-baseline justify-between gap-3">
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                  style={{
                    background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
                    color: "var(--color-accent)",
                  }}
                >
                  {badge}
                </span>
                <span className="text-right text-xs">{how}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Settings} tint="var(--color-muted)" title="Más">
          <p>
            Tu <B>foto de perfil</B>, tu <B>nombre</B> (el que ve tu pareja), <B>cambiar la contraseña</B>,{" "}
            <B>cerrar sesión</B> y esta guía, por si quieres volver a verla.
          </p>
        </Section>

        <p className="mx-5 mt-2 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Hecha con mucho cariño, para Rokito y Giselz. 💞
        </p>
      </div>
    </>
  );
}
