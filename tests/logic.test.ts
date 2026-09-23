import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/poop/stats";
import { getTogetherInfo } from "@/lib/couple";
import { zonedInputToUTC, formatDateTime } from "@/lib/format-date";
import { monthGridKeys, toDateKey, weekKeys } from "@/lib/calendar/date-utils";
import { NUDGE_GROUPS, findNudge } from "@/lib/nudges/options";

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
