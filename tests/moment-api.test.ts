import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({ calls: [] as { targets: unknown[]; payload: unknown }[] }));

vi.mock("@/lib/push/notify", () => ({
  sendPush: async (targets: unknown[], payload: unknown) => {
    push.calls.push({ targets, payload });
    return [];
  },
}));

import { POST } from "@/app/api/momento/route";

const target = { endpoint: "https://web.push.apple.com/abc", p256dh: "k", auth: "a" };

function request(body: unknown, auth?: string): Request {
  return new Request("https://ratta-app.vercel.app/api/momento", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  push.calls = [];
  vi.stubEnv("MOMENT_CRON_SECRET", "clave-del-despertador");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Aviso del Momento Ratta (/api/momento)", () => {
  it("con la clave correcta, avisa a los móviles que le pasa el despertador", async () => {
    const res = await POST(request({ targets: [target] }, "Bearer clave-del-despertador"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1, gone: 0 });
    expect(push.calls).toHaveLength(1);
    expect(push.calls[0]?.payload).toMatchObject({ title: "📸 ¡Es la hora del Momento Ratta!", url: "/momento" });
  });

  it("acepta la clave aunque en Vercel se pegara con espacios o un salto de línea", async () => {
    vi.stubEnv("MOMENT_CRON_SECRET", "  clave-del-despertador\n");
    expect((await POST(request({ targets: [target] }, "Bearer clave-del-despertador"))).status).toBe(200);
  });

  it("sin clave o con una clave falsa, no hace nada", async () => {
    expect((await POST(request({ targets: [target] }))).status).toBe(401);
    expect((await POST(request({ targets: [target] }, "Bearer adivinando"))).status).toBe(401);
    expect((await POST(request({ targets: [target] }, "clave-del-despertador"))).status).toBe(401);
    expect(push.calls).toHaveLength(0);
  });

  it("si la clave no está configurada en Vercel, no acepta nada", async () => {
    vi.stubEnv("MOMENT_CRON_SECRET", "");
    expect((await POST(request({ targets: [target] }, "Bearer "))).status).toBe(503);
    expect(push.calls).toHaveLength(0);
  });

  it("rechaza cuerpos raros o destinos que no son https", async () => {
    const auth = "Bearer clave-del-despertador";
    expect((await POST(request("esto no es json", auth))).status).toBe(400);
    expect((await POST(request({ targets: [{ ...target, endpoint: "http://inseguro.test" }] }, auth))).status).toBe(400);
    expect((await POST(request({ targets: Array.from({ length: 21 }, () => target) }, auth))).status).toBe(400);
    expect(push.calls).toHaveLength(0);
  });
});
