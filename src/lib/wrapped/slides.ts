import { daysBetween } from "@/lib/calendar/date-utils";
import { REACTION_EMOJIS } from "@/lib/chat/types";
import { yearLabel, type WrappedPeriod } from "./period";

/** Lo que se cuenta de cada uno (por id de persona). */
type PerPerson = Record<string, number>;

export type WrappedStats = {
  period: WrappedPeriod;
  /** Días juntos desde el principio hasta el final del periodo. */
  daysTogether: number;
  messages: PerPerson;
  chatPhotos: number;
  /** Veces que se usó cada emoji de reacción. */
  reactions: Record<string, number>;
  moments: PerPerson;
  /** Momentos subidos a tiempo (en los 10 minutos). */
  momentsOnTime: PerPerson;
  plans: number;
  loveDays: number;
  memories: number;
  hearts: PerPerson;
  flappyBest: PerPerson;
  trono: PerPerson;
  wishesDone: number;
  capsulesOpened: number;
  /** Un recuerdo al azar del periodo, para la foto del final. */
  memoryPhoto: { url: string; caption: string | null } | null;
};

export type Slide = {
  id: string;
  emoji: string;
  /** Línea pequeña de arriba. */
  kicker: string;
  /** El número (o texto) grande. */
  big: number | string;
  /** Lo que va justo debajo del número. */
  unit: string;
  lines: string[];
  /** Barras para comparar a los dos. */
  bars?: { label: string; value: number }[];
  photo?: { url: string; caption: string | null };
  /** Colores del fondo (degradado). */
  colors: [string, string];
};

const fmt = new Intl.NumberFormat("es-ES");
const n = (value: number) => fmt.format(value);
const sum = (p: PerPerson) => Object.values(p).reduce((a, b) => a + b, 0);

/** Quién tiene más (o null si empatan o no hay nada). */
function leader(p: PerPerson, ids: string[]): string | null {
  const [a, b] = ids;
  if (!a) return null;
  if (!b) return (p[a] ?? 0) > 0 ? a : null;
  const va = p[a] ?? 0;
  const vb = p[b] ?? 0;
  if (va === vb) return null;
  return va > vb ? a : b;
}

function bars(p: PerPerson, ids: string[], names: Record<string, string>) {
  return ids.map((id) => ({ label: names[id] ?? "?", value: p[id] ?? 0 }));
}

/**
 * Las pantallas del Wrapped, en orden. Las que no tienen datos (por
 * ejemplo, si no habéis jugado al Flappy) no salen.
 */
export function buildSlides(stats: WrappedStats, ids: string[], names: Record<string, string>): Slide[] {
  const { period } = stats;
  const name = (id: string | null) => (id ? (names[id] ?? "Tu pareja") : null);
  const slides: Slide[] = [];
  const days = daysBetween(period.from, period.to) + 1;

  slides.push({
    id: "intro",
    emoji: "🎁",
    kicker: "Ratta Wrapped",
    big: period.complete ? "¡Feliz aniversario!" : "Vuestro año, hasta hoy",
    unit: period.complete ? `Así fue ${yearLabel(period.year)} juntos` : `Así va ${yearLabel(period.year)} juntos`,
    lines: ["Toca para seguir →"],
    colors: ["#7c3aed", "#e1225e"],
  });

  slides.push({
    id: "days",
    emoji: "💞",
    kicker: period.complete ? "Este año habéis pasado" : "Este año lleváis",
    big: days,
    unit: days === 1 ? "día juntos" : "días juntos",
    lines: [`${n(days * 24)} horas · ${n(days * 24 * 60)} minutos`, `${n(stats.daysTogether)} días desde que empezó todo`],
    colors: ["#e1225e", "#ff7a45"],
  });

  const totalMessages = sum(stats.messages);
  if (totalMessages > 0) {
    const chatty = name(leader(stats.messages, ids));
    slides.push({
      id: "chat",
      emoji: "💬",
      kicker: "Os habéis escrito",
      big: totalMessages,
      unit: totalMessages === 1 ? "mensaje" : "mensajes",
      lines: [
        stats.chatPhotos > 0 ? `…y ${n(stats.chatPhotos)} ${stats.chatPhotos === 1 ? "foto" : "fotos"} 📷` : "",
        chatty ? `${chatty} es quien más habla 🗣️` : "¡Habláis exactamente lo mismo! 🤝",
      ].filter(Boolean),
      bars: bars(stats.messages, ids, names),
      colors: ["#2563eb", "#7c3aed"],
    });
  }

  const [topEmoji, topCount] = Object.entries(stats.reactions)
    .filter(([emoji]) => (REACTION_EMOJIS as readonly string[]).includes(emoji))
    .sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  if (topCount > 0) {
    slides.push({
      id: "reaction",
      emoji: topEmoji,
      kicker: "Vuestra reacción favorita",
      big: topEmoji,
      unit: `${n(topCount)} ${topCount === 1 ? "vez" : "veces"}`,
      lines: ["Lo dice todo, ¿no?"],
      colors: ["#db2777", "#f59e0b"],
    });
  }

  const totalMoments = sum(stats.moments);
  if (totalMoments > 0) {
    const pct = (id: string) => {
      const total = stats.moments[id] ?? 0;
      return total > 0 ? Math.round(((stats.momentsOnTime[id] ?? 0) / total) * 100) : 0;
    };
    const punctual = ids.length === 2 && pct(ids[0]!) !== pct(ids[1]!)
      ? (pct(ids[0]!) > pct(ids[1]!) ? ids[0]! : ids[1]!)
      : null;
    slides.push({
      id: "moments",
      emoji: "📸",
      kicker: "Momentos Ratta",
      big: totalMoments,
      unit: "fotos de lo que estabais haciendo",
      lines: [
        punctual
          ? `${name(punctual)} es quien más llega a tiempo (${pct(punctual)} %) ⏱️`
          : "¡Igual de puntuales los dos! ⏱️",
      ],
      bars: bars(stats.moments, ids, names),
      colors: ["#0ea5e9", "#22c55e"],
    });
  }

  if (stats.plans > 0) {
    slides.push({
      id: "plans",
      emoji: "📅",
      kicker: "Habéis tenido",
      big: stats.plans,
      unit: stats.plans === 1 ? "plan juntos" : "planes juntos",
      lines: [
        stats.loveDays > 0
          ? `…y ${stats.loveDays} ${stats.loveDays === 1 ? "día 6" : "días 6"} con el amor de vuestra vida 💞`
          : "",
        stats.wishesDone > 0
          ? `Cumplisteis ${stats.wishesDone} ${stats.wishesDone === 1 ? "deseo" : "deseos"} de la lista ✨`
          : "",
      ].filter(Boolean),
      colors: ["#7c3aed", "#0ea5e9"],
    });
  }

  const totalHearts = sum(stats.hearts);
  if (totalHearts > 0) {
    const lover = name(leader(stats.hearts, ids));
    slides.push({
      id: "hearts",
      emoji: "❤️",
      kicker: "Os habéis enviado",
      big: totalHearts,
      unit: "corazones",
      lines: [lover ? `${lover} es más cariñoso/a 🥰` : "¡Empate de amor! 🥰"],
      bars: bars(stats.hearts, ids, names),
      colors: ["#e1225e", "#f43f5e"],
    });
  }

  const flappyChamp = leader(stats.flappyBest, ids);
  if (sum(stats.flappyBest) > 0) {
    slides.push({
      id: "flappy",
      emoji: "🐀",
      kicker: "Flappy Rata",
      big: Math.max(...Object.values(stats.flappyBest)),
      unit: "es el récord del año",
      lines: [flappyChamp ? `Campeón/a: ${name(flappyChamp)} 🏆` : "¡Empatados en lo más alto! 🏆"],
      bars: bars(stats.flappyBest, ids, names),
      colors: ["#16a34a", "#84cc16"],
    });
  }

  const totalTrono = sum(stats.trono);
  if (totalTrono > 0) {
    const king = name(leader(stats.trono, ids));
    slides.push({
      id: "trono",
      emoji: "👑",
      kicker: "El Trono",
      big: totalTrono,
      unit: "visitas entre los dos 💩",
      lines: [king ? `${king} reina en el Trono 👑` : "El Trono es compartido 👑"],
      bars: bars(stats.trono, ids, names),
      colors: ["#a16207", "#f59e0b"],
    });
  }

  if (stats.memories > 0 || stats.capsulesOpened > 0) {
    slides.push({
      id: "memories",
      emoji: "🖼️",
      kicker: "Guardasteis",
      big: stats.memories,
      unit: stats.memories === 1 ? "recuerdo" : "recuerdos",
      lines: [
        stats.capsulesOpened > 0
          ? `y abristeis ${stats.capsulesOpened} ${stats.capsulesOpened === 1 ? "carta" : "cartas"} de la cápsula del tiempo 💌`
          : "",
      ].filter(Boolean),
      photo: stats.memoryPhoto ?? undefined,
      colors: ["#9333ea", "#ec4899"],
    });
  }

  slides.push({
    id: "end",
    emoji: "🐀💞🐀",
    kicker: period.complete ? `Gracias por ${yearLabel(period.year)}` : "Y lo que queda…",
    big: "Por muchos más",
    unit: "juntos",
    lines: ["Ratta · nuestro pequeño mundo para dos"],
    colors: ["#7c3aed", "#ff7a45"],
  });

  return slides;
}
