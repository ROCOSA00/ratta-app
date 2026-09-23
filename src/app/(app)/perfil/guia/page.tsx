import type { ComponentType, ReactNode } from "react";
import {
  CalendarDays,
  Crown,
  Heart,
  MessageCircleHeart,
  Home,
  Images,
  Music,
  MessageCircleQuestion,
  NotebookPen,
  UserRound,
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
      <PageHeader title="Cómo funciona Ratta" subtitle="Una vuelta rápida por todo" backHref="/perfil" />

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
            • <B>Recuerdo del día</B>: cada día, una de vuestras fotos.
          </p>
          <p>
            • <B>Pregunta del día</B>, <B>Cariño</B>, vuestra <B>música</B>, <B>El Trono</B> y tu{" "}
            <B>nota fijada</B>, para usarlos sin cambiar de pestaña.
          </p>
        </Section>

        <Section icon={MessageCircleHeart} tint="var(--color-accent)" title="Chat">
          <p>
            Vuestro chat privado, en la pestaña <B>Chat</B>. Los mensajes llegan al instante, y si tenéis las
            notificaciones activadas, os avisa aunque la app esté cerrada.
          </p>
          <p>
            Con el botón 📷 puedes mandar <B>fotos</B> (con un texto si quieres). Toca una foto para verla en grande.
            Son privadas: solo las veis vosotros dos.
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
            Toca <B>Mandar un mensajito</B> y elige uno de sus tres grupos: <B>Cariño</B> (🥰 Te quiero, 🥺 Te
            echo de menos…), <B>Planes</B> (🛌 ¿Pijamada?, 🍕 Tengo hambre, 🚬 ¿Fumamos?…) y <B>Tonterías</B> (💩
            Tengo caca, 💨 el pedo que flipas…). Se envía al momento y a tu pareja le aparece en Inicio (y le llega
            como notificación).
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

        <Section icon={Images} tint="var(--color-gold)" title="Recuerdos">
          <p>
            Vuestra galería de fotos juntos. Entra desde Inicio o desde tu Perfil, toca <B>Añadir un recuerdo</B>,
            elige la foto y, si quieres, ponle un pie y la fecha.
          </p>
          <p>
            Las fotos son <B>privadas</B>: solo las veis vosotros dos. Cada uno puede borrar las que ha subido él/ella.
          </p>
        </Section>

        <Section icon={Music} tint="var(--color-accent-2)" title="Nuestra música">
          <p>
            Vuestra playlist de Spotify, en Inicio. Dale al play para escucharla ahí mismo, o a{" "}
            <B>Abrir en Spotify</B> para ir a la app.
          </p>
        </Section>

        <Section icon={UserRound} tint="var(--color-accent-2)" title="Perfil">
          <p>
            Tu <B>foto de perfil</B> y tu <B>foto de portada</B> (toca cualquiera de las dos para cambiarla), tu{" "}
            <B>nombre</B> (el que ve tu pareja), <B>cambiar la contraseña</B>, <B>cerrar sesión</B> y esta guía.
          </p>
          <p>
            Y las <B>notificaciones</B>: actívalas una vez en cada móvil y te avisará cuando tu pareja te escriba, te
            mande cariño, añada un plan, una nota o un recuerdo, responda la pregunta del día o visite El Trono. En el
            iPhone solo funcionan con la app instalada en la pantalla de inicio.
          </p>
        </Section>

        <p className="mx-5 mt-2 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Hecha con mucho cariño, para Rokito y Giselz. 💞
        </p>
      </div>
    </>
  );
}
