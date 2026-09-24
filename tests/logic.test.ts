import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/poop/stats";
import { getTogetherInfo } from "@/lib/couple";
import { zonedInputToUTC, formatDateTime } from "@/lib/format-date";
import { monthGridKeys, toDateKey, weekKeys } from "@/lib/calendar/date-utils";
import { NUDGE_GROUPS, findNudge } from "@/lib/nudges/options";
import { computeHeartStats } from "@/lib/hearts/stats";
import { lateLabel } from "@/lib/moments/config";
import { collides, flap, gapFor, newGame, RAT_X, speedFor, step, STEP, WORLD_H, type GameState } from "@/lib/flappy/engine";
import { summarizePlayer } from "@/lib/games/get-flappy-summary";
import { DEFAULT_PREFS, htmlAttributes, parsePrefs, serializePrefs } from "@/lib/prefs";
import { TOUR_STEPS } from "@/components/tour/steps";
import { STATUS_OPTIONS, findStatus } from "@/lib/status/options";

describe("Hora de Madrid", () => {
  it("convierte la hora escrita en el formulario al instante UTC correcto (verano, invierno, medianoche)", () => {
    expect(zonedInputToUTC("2026-09-25T20:00").toISOString()).toBe("2026-09-25T18:00:00.000Z");
    expect(zonedInputToUTC("2026-01-15T20:00").toISOString()).toBe("2026-01-15T19:00:00.000Z");
    expect(zonedInputToUTC("2026-01-15T00:00").toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });

  it("y la muestra de vuelta tal como se escribió", () => {
    expect(formatDateTime(zonedInputToUTC("2026-09-25T20:00").toISOString())).toContain("20:00");
  });

  it("agrupa por día de Madrid: las 00:30 de Madrid ya son el día siguiente", () => {
    expect(toDateKey(new Date("2026-09-24T22:30:00Z"))).toBe("2026-09-25");
  });

  it("la rejilla del mes empieza en lunes y tiene 6 semanas", () => {
    const grid = monthGridKeys("2026-09-15");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-08-31");
    expect(grid[1]).toBe("2026-09-01");
    expect(weekKeys("2026-09-25")).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });
});

describe("El Trono: estadísticas", () => {
  const now = new Date("2026-09-24T22:30:00Z"); // 25 sep, 00:30 en Madrid
  const A = "a";
  const B = "b";
  const entries = [
    { user_id: A, logged_at: "2026-09-24T22:10:00Z" }, // 25 sep 00:10 Madrid -> hoy, noctámbulo
    { user_id: A, logged_at: "2026-09-24T04:00:00Z" }, // 24 sep 06:00 Madrid -> madrugador
    { user_id: A, logged_at: "2026-09-24T10:00:00Z" }, // 24 sep -> doblete
    { user_id: A, logged_at: "2026-09-23T12:00:00Z" }, // 23 sep -> racha de 3
    { user_id: B, logged_at: "2026-09-24T15:00:00Z" }, // solo ayer
    { user_id: "ya-no-es-miembro", logged_at: "2026-09-24T15:00:00Z" },
  ];
  const stats = computeStats(entries, [A, B], now);

  it("cuenta hoy, semana, racha y récord por día de Madrid", () => {
    expect(stats[A]).toMatchObject({ today: 1, week: 4, total: 4, streak: 3, bestDay: 2 });
    expect(stats[A]?.last7.slice(-3)).toEqual([1, 2, 1]);
  });

  it("no rompe la racha a mitad del día si hoy aún no hay registro", () => {
    expect(stats[B]).toMatchObject({ today: 0, streak: 1 });
  });

  it("da los logros que tocan y ninguno más", () => {
    expect(stats[A]?.badges).toEqual(
      expect.arrayContaining(["🔥 En racha", "✌️ Doblete", "🌅 Madrugador/a", "🦉 Noctámbulo/a"]),
    );
    expect(stats[B]?.badges).toEqual(["🎉 Primera vez"]);
  });

  it("ignora registros de alguien que ya no es del espacio", () => {
    expect(Object.keys(stats)).toEqual([A, B]);
  });
});

describe("Días juntos (desde el 6 de marzo de 2026)", () => {
  it("cuenta los días y los desglosa", () => {
    expect(getTogetherInfo("2026-09-23")).toEqual({
      days: 201,
      breakdown: "6 meses y 17 días",
      milestone: null,
      nextLabel: "Faltan 13 días para los 7 meses",
    });
  });

  it("celebra los días señalados", () => {
    expect(getTogetherInfo("2026-04-06").milestone).toBe("¡Hoy hacéis 1 mes! 🎉");
    expect(getTogetherInfo("2026-06-14").milestone).toBe("¡Hoy cumplís 100 días juntos! 🎉");
    expect(getTogetherInfo("2027-03-06").milestone).toBe("¡Feliz 1 año juntos! 🎉");
  });

  it("usa singular y 'el año' cuando toca", () => {
    expect(getTogetherInfo("2026-04-05").nextLabel).toBe("Falta 1 día para el primer mes");
    expect(getTogetherInfo("2027-02-10").nextLabel).toBe("Faltan 24 días para el año");
    expect(getTogetherInfo("2027-05-10").breakdown).toBe("1 año, 2 meses y 4 días");
  });
});

// ---------------------------------------------------------- Mensajitos

describe("Lista de mensajitos", () => {
  const all = NUDGE_GROUPS.flatMap((g) => g.options);

  it("no hay keys repetidas y los textos caben en una notificación", () => {
    expect(new Set(all.map((o) => o.key)).size).toBe(all.length);
    for (const o of all) {
      expect(o.key.length).toBeLessThanOrEqual(40);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.label.length).toBeLessThanOrEqual(40);
    }
  });

  it("siguen existiendo los mensajitos antiguos y están los nuevos", () => {
    const keys = ["te_quiero", "te_echo_de_menos", "pienso_en_ti", "buenas_noches", "pijamada", "tengo_hambre"];
    for (const key of [...keys, "fumamos", "tengo_caca", "pedo"]) {
      expect(findNudge(key)).not.toBeNull();
    }
    expect(findNudge("hackeo")).toBeNull();
    expect(findNudge("toString")).toBeNull();
  });
});

// ---------------------------------------------------------- Corazones

describe("Ranking de corazones", () => {
  // Hoy es jueves 24/09/2026: la semana empieza el lunes 21 y el mes el 1.
  const today = "2026-09-24";
  const rows = [
    { user_id: "yo", day: "2026-09-24", count: 30 },
    { user_id: "yo", day: "2026-09-21", count: 10 }, // lunes: esta semana
    { user_id: "yo", day: "2026-09-20", count: 5 }, // domingo: semana pasada, este mes
    { user_id: "yo", day: "2026-08-31", count: 100 }, // mes pasado
    { user_id: "ella", day: "2026-09-24", count: 45 },
    { user_id: "intruso", day: "2026-09-24", count: 999 }, // no es del espacio
  ];

  it("suma hoy, semana (desde el lunes), mes y total por persona", () => {
    const { totals } = computeHeartStats(rows, ["yo", "ella"], today);
    expect(totals.yo).toEqual({ today: 30, week: 40, month: 45, total: 145 });
    expect(totals.ella).toEqual({ today: 45, week: 45, month: 45, total: 45 });
    expect(totals.intruso).toBeUndefined();
  });

  it("el récord es el mejor día de cualquiera de los dos", () => {
    expect(computeHeartStats(rows, ["yo", "ella"], today).record).toEqual({
      userId: "yo",
      day: "2026-08-31",
      count: 100,
    });
  });

  it("sin corazones todo es cero y no hay récord", () => {
    const stats = computeHeartStats([], ["yo", "ella"], today);
    expect(stats.totals.yo).toEqual({ today: 0, week: 0, month: 0, total: 0 });
    expect(stats.record).toBeNull();
  });
});

// ---------------------------------------------------------- Momento Ratta

describe("Etiqueta de retraso del Momento", () => {
  it("a tiempo, minutos y horas", () => {
    expect(lateLabel(0)).toBe("✅ A tiempo");
    expect(lateLabel(20)).toBe("⏰ 1 min tarde");
    expect(lateLabel(754)).toBe("⏰ 13 min tarde");
    expect(lateLabel(3600)).toBe("⏰ 1 h tarde");
    expect(lateLabel(5400)).toBe("⏰ 1 h 30 min tarde");
  });
});

// ------------------------------------------------------------ Flappy Rata

describe("Flappy Rata: motor del juego", () => {
  const run = (s: GameState, seconds: number, random = () => 0.5) => {
    let state = s;
    for (let i = 0; i < Math.round(seconds / STEP); i++) state = step(state, random);
    return state;
  };

  it("empieza esperando y no cae hasta el primer toque", () => {
    const s = run(newGame(), 2);
    expect(s.status).toBe("ready");
    expect(s.ratY).toBe(newGame().ratY);
  });

  it("al tocar sube, y luego la gravedad la hace caer", () => {
    const s0 = flap(newGame());
    expect(s0.status).toBe("playing");
    const up = run(s0, 0.1);
    expect(up.ratY).toBeLessThan(s0.ratY);
    const down = run(up, 0.6);
    expect(down.ratY).toBeGreaterThan(up.ratY);
  });

  it("si no tocas, se estrella contra el suelo", () => {
    const s = run(flap(newGame()), 5);
    expect(s.status).toBe("over");
    expect(s.score).toBe(0);
  });

  it("tocar sin parar no te mata contra el techo: te quedas pegada a él", () => {
    let s = flap(newGame());
    for (let i = 0; i < 120; i++) {
      s = step(flap(s));
    }
    expect(s.status).toBe("playing");
    expect(s.ratY).toBeGreaterThan(0);
  });

  it("chocar con una tubería termina la partida", () => {
    const s: GameState = {
      ...flap(newGame()),
      ratY: 100,
      pipes: [{ x: RAT_X - 10, gapY: 400, gap: 150, scored: false }],
    };
    expect(collides(s)).toBe(true);
    expect(collides({ ...s, ratY: 400 })).toBe(false);
  });

  it("se va poniendo más difícil, con límites", () => {
    expect(speedFor(0)).toBeLessThan(speedFor(10));
    expect(speedFor(1000)).toBe(230);
    expect(gapFor(0)).toBeGreaterThan(gapFor(10));
    expect(gapFor(1000)).toBe(128);
  });

  it("se puede ganar: un jugador automático sencillo pasa 25 tuberías sumando puntos", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let s = flap(newGame());
    for (let i = 0; i < 120 * 90 && s.status === "playing" && s.score < 25; i++) {
      const next = s.pipes.find((p) => p.x + 64 > RAT_X - 15);
      const target = next ? next.gapY + next.gap / 4 : WORLD_H / 2;
      if (s.ratY > target && s.vy > 0) s = flap(s);
      s = step(s, random);
    }
    expect(s.score).toBeGreaterThanOrEqual(25);
  });
});

describe("Flappy Rata: ranking", () => {
  const rows = [
    { user_id: "yo", day: "2026-09-24", best: 7, plays: 3 },
    { user_id: "yo", day: "2026-09-20", best: 15, plays: 10 },
    { user_id: "ella", day: "2026-09-23", best: 9, plays: 2 },
  ];

  it("récord de siempre, mejor de hoy y partidas totales", () => {
    expect(summarizePlayer(rows, "yo", "2026-09-24", "Tú")).toEqual({ name: "Tú", best: 15, todayBest: 7, plays: 13 });
    expect(summarizePlayer(rows, "ella", "2026-09-24", "Giselz")).toEqual({
      name: "Giselz",
      best: 9,
      todayBest: 0,
      plays: 2,
    });
    expect(summarizePlayer([], "yo", "2026-09-24", "Tú")).toEqual({ name: "Tú", best: 0, todayBest: 0, plays: 0 });
  });
});

// --------------------------------------------------------------- Ajustes

describe("Ajustes (cookie de preferencias)", () => {
  it("sin cookie, todo por defecto", () => {
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("")).toEqual(DEFAULT_PREFS);
  });

  it("guarda y vuelve a leer exactamente lo mismo", () => {
    const prefs = {
      theme: "dark" as const,
      textSize: "large" as const,
      reduceMotion: true,
      splash: false,
      haptics: false,
      hiddenHome: ["music" as const, "trono" as const],
    };
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
  });

  it("una cookie rota o manipulada no rompe nada: vuelve a lo de por defecto", () => {
    for (const bad of ["%%%", "no-es-json", encodeURIComponent("null"), encodeURIComponent("[1,2]")]) {
      expect(parsePrefs(bad)).toEqual(DEFAULT_PREFS);
    }
    const weird = encodeURIComponent(
      JSON.stringify({ theme: "rosa", textSize: 99, reduceMotion: "sí", hiddenHome: ["music", "hackeo", "music", 3] }),
    );
    expect(parsePrefs(weird)).toEqual({ ...DEFAULT_PREFS, hiddenHome: ["music"] });
  });

  it("atributos de <html>: nada en automático; data-theme solo si eliges claro u oscuro", () => {
    expect(htmlAttributes(DEFAULT_PREFS)).toEqual({});
    expect(htmlAttributes({ ...DEFAULT_PREFS, theme: "light" })).toEqual({ "data-theme": "light" });
    expect(htmlAttributes({ ...DEFAULT_PREFS, theme: "dark", textSize: "large", reduceMotion: true })).toEqual({
      "data-theme": "dark",
      "data-text": "large",
      "data-motion": "reduced",
    });
  });
});

describe("Tutorial interactivo", () => {
  it("cada paso tiene id único, título y texto; los de tocar tienen algo que tocar", () => {
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
    for (const step of TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
      if (step.action === "tap") expect(step.target).toMatch(/^nav-/);
    }
  });

  it("cada «toca» lleva a la pantalla del paso siguiente", () => {
    TOUR_STEPS.forEach((step, i) => {
      if (step.action !== "tap") return;
      const next = TOUR_STEPS[i + 1];
      expect(next?.path).toBe(`/${step.target!.slice("nav-".length)}`);
    });
  });
});

describe("Estados de ánimo", () => {
  it("keys únicas y válidas para la base de datos (a-z y _)", () => {
    expect(new Set(STATUS_OPTIONS.map((o) => o.key)).size).toBe(STATUS_OPTIONS.length);
    for (const o of STATUS_OPTIONS) expect(o.key).toMatch(/^[a-z_]{1,30}$/);
    expect(findStatus("cagon")?.emoji).toBe("💩");
    expect(findStatus("hackeo")).toBeNull();
    expect(findStatus(null)).toBeNull();
  });
});
