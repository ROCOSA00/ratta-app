import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({ calls: [] as { targets: unknown[]; payload: unknown }[] }));

vi.mock("@/lib/push/notify", () => ({
  sendPush: async (targets: unknown[], payload: unknown) => {
    push.calls.push({ targets, payload });
    return [];
  },
}));

import { POST } from "@/app/api/capsulas/route";

const target = { endpoint: "https://web.push.apple.com/abc", p256dh: "k", auth: "a" };

function request(payload: unknown, auth?: string): Request {
  return new Request("https://ratta-app.vercel.app/api/capsulas", {
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

describe("Aviso de cápsula que se abre hoy (/api/capsulas)", () => {
  it("con la clave correcta, avisa de que hoy se abre una carta", async () => {
    const res = await POST(request({ targets: [target], author: "Rokito" }, "Bearer clave-del-despertador"));
    expect(res.status).toBe(200);
    expect(push.calls[0]?.payload).toEqual({
      title: "💌 ¡Hoy se abre una carta!",
      body: "Rokito te escribió una carta que se abre hoy. Ábrela en Ratta.",
      url: "/capsulas",
      tag: "capsula",
    });
  });

  it("sin la clave o con cuerpos raros, no hace nada", async () => {
    expect((await POST(request({ targets: [target], author: "Rokito" }))).status).toBe(401);
    const auth = "Bearer clave-del-despertador";
    expect((await POST(request({ targets: [target], author: "" }, auth))).status).toBe(400);
    expect((await POST(request({ targets: [target] }, auth))).status).toBe(400);
    expect((await POST(request("no es json", auth))).status).toBe(400);
    expect(push.calls).toHaveLength(0);
  });
});
