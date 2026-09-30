import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({ calls: [] as { targets: unknown[]; payload: unknown }[] }));

vi.mock("@/lib/push/notify", () => ({
  sendPush: async (targets: unknown[], payload: unknown) => {
    push.calls.push({ targets, payload });
    return [];
  },
}));

import { POST } from "@/app/api/recordatorios/route";

const target = { endpoint: "https://web.push.apple.com/abc", p256dh: "k", auth: "a" };
const body = {
  targets: [target],
  day: "2026-10-10",
  events: [{ title: "Yoga", time: "10:00", love: false, since: "2026-10-03" }],
};

function request(payload: unknown, auth?: string): Request {
  return new Request("https://ratta-app.vercel.app/api/recordatorios", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

beforeEach(() => {
  push.calls = [];
  vi.stubEnv("MOMENT_CRON_SECRET", "clave-del-despertador");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Aviso del día antes (/api/recordatorios)", () => {
  it("con la clave correcta, avisa de los planes de mañana", async () => {
    const res = await POST(request(body, "Bearer clave-del-despertador"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1, gone: 0 });
    expect(push.calls[0]?.payload).toMatchObject({ title: "⏰ Mañana: Yoga", url: "/calendario?view=month&ref=2026-10-10" });
  });

  it("sin la clave (o con una falsa), no hace nada", async () => {
    expect((await POST(request(body))).status).toBe(401);
    expect((await POST(request(body, "Bearer adivinando"))).status).toBe(401);
    vi.stubEnv("MOMENT_CRON_SECRET", "");
    expect((await POST(request(body, "Bearer "))).status).toBe(503);
    expect(push.calls).toHaveLength(0);
  });

  it("rechaza cuerpos raros", async () => {
    const auth = "Bearer clave-del-despertador";
    for (const bad of [
      "no es json",
      { ...body, day: "mañana" },
      { ...body, events: [] },
      { ...body, events: [{ title: "", time: null, love: false, since: "2026-10-03" }] },
      { ...body, events: [{ title: "X", time: "10h", love: false, since: "2026-10-03" }] },
      { ...body, targets: [{ ...target, endpoint: "http://inseguro.test" }] },
    ]) {
      expect((await POST(request(bad, auth))).status).toBe(400);
    }
    expect(push.calls).toHaveLength(0);
  });
});
