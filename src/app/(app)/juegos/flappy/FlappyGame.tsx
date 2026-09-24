"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  flap,
  GROUND_H,
  newGame,
  PIPE_WIDTH,
  RAT_X,
  STEP,
  step,
  WORLD_H,
  WORLD_W,
  type GameState,
} from "@/lib/flappy/engine";
import { submitFlappyScore } from "@/lib/games/actions";
import type { FlappyPlayer, FlappySummary } from "@/lib/games/get-flappy-summary";

// Tras chocar, un momento sin aceptar toques: si no, el toque con el que
// ibas a aletear empieza otra partida sin querer.
const RESTART_DELAY_MS = 700;

type Result = { score: number; message: string | null };

function draw(ctx: CanvasRenderingContext2D, s: GameState) {
  // Cielo
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, "#c7b8ff");
  sky.addColorStop(0.55, "#ffc6dc");
  sky.addColorStop(1, "#ffe0c2");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Nubes (se mueven despacio, aunque no estés jugando)
  ctx.font = "34px sans-serif";
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 130 - s.time * (12 + i * 4)) % (WORLD_W + 120) + WORLD_W + 120) % (WORLD_W + 120) - 60;
    ctx.fillText("☁️", x, 70 + i * 90);
  }
  ctx.globalAlpha = 1;

  // Tuberías
  for (const p of s.pipes) {
    const top = p.gapY - p.gap / 2;
    const bottom = p.gapY + p.gap / 2;
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(p.x, 0, PIPE_WIDTH, top);
    ctx.fillRect(p.x, bottom, PIPE_WIDTH, WORLD_H - GROUND_H - bottom);
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(p.x - 5, top - 18, PIPE_WIDTH + 10, 18);
    ctx.fillRect(p.x - 5, bottom, PIPE_WIDTH + 10, 18);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(p.x + 8, 0, 8, top - 18);
    ctx.fillRect(p.x + 8, bottom + 18, 8, WORLD_H - GROUND_H - bottom - 18);
  }

  // Suelo con rayas que avanzan
  ctx.fillStyle = "#f5c451";
  ctx.fillRect(0, WORLD_H - GROUND_H, WORLD_W, GROUND_H);
  ctx.fillStyle = "#e2a93b";
  const offset = s.status === "playing" ? (s.time * 150) % 40 : 0;
  for (let x = -offset; x < WORLD_W; x += 40) ctx.fillRect(x, WORLD_H - GROUND_H, 20, 8);

  // La rata: mirando a la derecha, inclinada según sube o cae
  const tilt = s.status === "ready" ? Math.sin(s.time * 4) * 0.1 : Math.max(-0.5, Math.min(1.2, s.vy / 600));
  const bob = s.status === "ready" ? Math.sin(s.time * 3) * 8 : 0;
  ctx.save();
  ctx.translate(RAT_X, s.ratY + bob);
  ctx.rotate(tilt);
  ctx.scale(-1, 1);
  ctx.font = "36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🐀", 0, 0);
  ctx.restore();

  // Puntos
  if (s.status !== "ready") {
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(60,20,80,0.55)";
    ctx.strokeText(String(s.score), WORLD_W / 2, 28);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(s.score), WORLD_W / 2, 28);
  }
}

export function FlappyGame({ summary }: { summary: FlappySummary }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const game = useRef<GameState>(newGame());
  const overAt = useRef(0);
  const [status, setStatus] = useState<GameState["status"]>("ready");
  const [result, setResult] = useState<Result | null>(null);
  const [me, setMe] = useState<FlappyPlayer>(summary.me);
  const partner = summary.partner;

  const finish = useCallback(
    (score: number) => {
      overAt.current = Date.now();
      setStatus("over");
      setResult({ score, message: null });
      navigator.vibrate?.(60);
      setMe((m) => ({
        ...m,
        best: Math.max(m.best, score),
        todayBest: Math.max(m.todayBest, score),
        plays: m.plays + 1,
      }));
      void submitFlappyScore(score).then((res) => {
        const message = res.error
          ? res.error
          : res.stoleRecord
            ? `👑 ¡Le has quitado el récord a ${partner?.name ?? "tu pareja"}!`
            : res.personalBest
              ? "🎉 ¡Nuevo récord personal!"
              : null;
        setResult({ score, message });
      });
    },
    [partner?.name],
  );

  // Bucle del juego: pasos fijos de física + dibujar cada fotograma.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const width = wrap.clientWidth;
      const scale = width / WORLD_W;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(WORLD_H * scale * dpr);
      canvas.style.height = `${WORLD_H * scale}px`;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      // Si la app estuvo en segundo plano, no "recuperar" todo ese tiempo.
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        const before = game.current.status;
        game.current = step(game.current);
        acc -= STEP;
        if (before === "playing" && game.current.status === "over") finish(game.current.score);
      }
      draw(ctx, game.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [finish]);

  const press = useCallback(() => {
    const s = game.current;
    if (s.status === "over") {
      if (Date.now() - overAt.current < RESTART_DELAY_MS) return;
      game.current = flap(newGame());
      setResult(null);
      setStatus("playing");
      return;
    }
    game.current = flap(s);
    if (s.status === "ready") setStatus("playing");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const leader =
    partner && me.best !== partner.best ? (me.best > partner.best ? me.name : partner.name) : null;

  return (
    <div className="mt-4 flex flex-col gap-4 px-5">
      <div
        ref={wrapRef}
        className="relative mx-auto select-none overflow-hidden rounded-3xl border shadow-lg"
        style={{
          // Que quepa entero en pantalla (con cabecera y barra) y asomen los
          // récords debajo: el ancho sale de la altura disponible.
          width: "min(100%, max(260px, calc((100svh - 360px) * 360 / 560)))",
          borderColor: "var(--color-line)",
          touchAction: "manipulation",
          WebkitUserSelect: "none",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          press();
        }}
        role="button"
        aria-label="Tocar para volar"
        tabIndex={0}
      >
        <canvas ref={canvasRef} className="block w-full" />

        {status === "ready" ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/4 flex flex-col items-center gap-1 text-center">
            <p className="text-3xl font-bold text-white drop-shadow-md">Flappy Rata</p>
            <p className="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold text-white">
              Toca para volar 🐀
            </p>
          </div>
        ) : null}

        {status === "over" && result ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div
              className="flex w-full max-w-[260px] flex-col items-center gap-1 rounded-2xl p-5 text-center shadow-xl"
              style={{ background: "var(--color-surface)", color: "var(--color-ink)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
                ¡Te has chocado! 💥
              </p>
              <p className="font-mono-nums text-5xl font-bold" style={{ color: "var(--color-accent)" }}>
                {result.score}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Tu récord: <b>{me.best}</b>
              </p>
              {result.message ? (
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
                  {result.message}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-semibold" style={{ color: "var(--color-accent-2)" }}>
                Toca para jugar otra vez
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent-2) 6%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent-2) 20%, var(--color-line))",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent-2)" }}>
          🏆 Récords
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[me, ...(partner ? [partner] : [])].map((p) => (
            <div
              key={p.name}
              className="rounded-xl p-3 text-center"
              style={{ background: "color-mix(in srgb, var(--color-accent-2) 10%, var(--color-surface))" }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
                {leader === p.name ? "👑 " : ""}
                {p.name}
              </p>
              <p className="font-mono-nums text-3xl font-bold" style={{ color: "var(--color-accent-2)" }}>
                {p.best}
              </p>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                hoy {p.todayBest} · {p.plays} {p.plays === 1 ? "partida" : "partidas"}
              </p>
            </div>
          ))}
        </div>
        {partner ? (
          <p className="mt-3 text-center text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            {leader === null
              ? me.best === 0
                ? "Aún no ha jugado nadie. ¡Estrénalo! 🐀"
                : "Empate a récord ⚖️"
              : leader === me.name
                ? "¡El récord es tuyo! 😎"
                : `${partner.name} tiene el récord. ¡A por él! 😤`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
