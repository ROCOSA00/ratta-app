/**
 * Motor de Flappy Rata: física, tuberías, puntos y choques. Sin nada de
 * pantalla, para poder probarlo. Todo va en "unidades de juego" (un campo
 * fijo de WORLD_W × WORLD_H) y la pantalla lo escala a su tamaño.
 *
 * Se avanza en pasos fijos (STEP) pase lo que pase con los fotogramas: así
 * el juego va igual de rápido en un móvil de 60 Hz que en uno de 120 Hz.
 */

export const WORLD_W = 360;
export const WORLD_H = 560;
export const GROUND_H = 56;
export const STEP = 1 / 120;

export const RAT_X = 90;
export const RAT_R = 15;
const GRAVITY = 1500;
const FLAP_VY = -440;
const MAX_FALL = 700;

const PIPE_W = 64;
const PIPE_SPACING = 220;
const GAP_START = 170;
const GAP_MIN = 128;
const SPEED_START = 150;
const SPEED_MAX = 230;

export type Pipe = { x: number; gapY: number; gap: number; scored: boolean };

export type GameState = {
  status: "ready" | "playing" | "over";
  ratY: number;
  vy: number;
  pipes: Pipe[];
  score: number;
  /** Segundos desde que empezó la partida (para animaciones). */
  time: number;
};

export function newGame(): GameState {
  return { status: "ready", ratY: WORLD_H / 2 - 40, vy: 0, pipes: [], score: 0, time: 0 };
}

/** Más difícil poco a poco: más rápido y huecos más estrechos. */
export function speedFor(score: number): number {
  return Math.min(SPEED_MAX, SPEED_START + score * 3);
}

export function gapFor(score: number): number {
  return Math.max(GAP_MIN, GAP_START - score * 2);
}

function spawnPipe(x: number, score: number, random: () => number): Pipe {
  const gap = gapFor(score);
  const minY = 60 + gap / 2;
  const maxY = WORLD_H - GROUND_H - 60 - gap / 2;
  return { x, gapY: minY + random() * (maxY - minY), gap, scored: false };
}

/** Tocar: si está esperando, empieza; si está jugando, aletea. */
export function flap(state: GameState): GameState {
  if (state.status === "over") return state;
  return { ...state, status: "playing", vy: FLAP_VY };
}

/** ¿El círculo de la rata toca el rectángulo? */
function hitsRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number): boolean {
  const nx = Math.max(x, Math.min(cx, x + w));
  const ny = Math.max(y, Math.min(cy, y + h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

export function collides(state: GameState): boolean {
  if (state.ratY + RAT_R >= WORLD_H - GROUND_H) return true;
  return state.pipes.some((p) => {
    const top = p.gapY - p.gap / 2;
    const bottom = p.gapY + p.gap / 2;
    return (
      hitsRect(RAT_X, state.ratY, RAT_R, p.x, -1000, PIPE_W, top + 1000) ||
      hitsRect(RAT_X, state.ratY, RAT_R, p.x, bottom, PIPE_W, WORLD_H - bottom)
    );
  });
}

/** Avanza un paso fijo. */
export function step(state: GameState, random: () => number = Math.random): GameState {
  if (state.status !== "playing") return { ...state, time: state.time + STEP };

  let vy = Math.min(MAX_FALL, state.vy + GRAVITY * STEP);
  let ratY = state.ratY + vy * STEP;
  // El techo no mata (como en el original): la rata se queda pegada a él.
  if (ratY - RAT_R < 0) {
    ratY = RAT_R;
    vy = Math.max(0, vy);
  }
  const dx = speedFor(state.score) * STEP;

  let score = state.score;
  let pipes = state.pipes
    .map((p) => ({ ...p, x: p.x - dx }))
    .filter((p) => p.x + PIPE_W > -10)
    .map((p) => {
      if (!p.scored && p.x + PIPE_W < RAT_X - RAT_R) {
        score += 1;
        return { ...p, scored: true };
      }
      return p;
    });

  const last = pipes[pipes.length - 1];
  if (!last) {
    pipes = [spawnPipe(WORLD_W + 40, score, random)];
  } else if (last.x < WORLD_W + 40 - PIPE_SPACING) {
    pipes = [...pipes, spawnPipe(last.x + PIPE_SPACING, score, random)];
  }

  const next: GameState = { ...state, ratY, vy, pipes, score, time: state.time + STEP };
  return collides(next) ? { ...next, status: "over" } : next;
}

export const PIPE_WIDTH = PIPE_W;
