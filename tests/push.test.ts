import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({
  sent: [] as { endpoint: string; data: string }[],
  vapid: [] as unknown[],
  failWith: new Map<string, number>(),
  rpcCalls: [] as { fn: string; args: unknown }[],
  partnerTargets: [] as { endpoint: string; p256dh: string; auth: string }[],
  afterTasks: [] as Promise<unknown>[],
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => {
      push.vapid.push(args);
    },
    sendNotification: async (sub: { endpoint: string }, data: string) => {
      const status = push.failWith.get(sub.endpoint);
      if (status) throw Object.assign(new Error("push failed"), { statusCode: status });
      push.sent.push({ endpoint: sub.endpoint, data });
    },
  },
}));

vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => {
    push.afterTasks.push(task());
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "me" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { display_name: "Rokito" } }) }),
        then: (resolve: (r: unknown) => unknown) =>
          Promise.resolve({ data: [{ endpoint: "https://push.test/mio", p256dh: "k", auth: "a" }] }).then(resolve),
      }),
    }),
    rpc: async (fn: string, args?: unknown) => {
      push.rpcCalls.push({ fn, args });
      if (fn === "partner_push_subscriptions") return { data: push.partnerTargets, error: null };
      return { data: null, error: null };
    },
  }),
}));

import { notifyPartner, sendPush } from "@/lib/push/notify";
import { saveSubscription, sendTestNotification } from "@/lib/push/actions";

const target = (endpoint: string) => ({ endpoint, p256dh: "k", auth: "a" });

beforeEach(() => {
  push.sent = [];
  push.vapid = [];
  push.failWith = new Map();
  push.rpcCalls = [];
  push.partnerTargets = [];
  push.afterTasks = [];
  vi.stubEnv("VAPID_PRIVATE_KEY", "clave-privada-de-prueba");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Envío de notificaciones", () => {
  it("sin clave privada configurada no envía nada (y no rompe nada)", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    const gone = await sendPush([target("https://push.test/a")], { title: "t", body: "b", url: "/" });
    expect(gone).toEqual([]);
    expect(push.sent).toHaveLength(0);
  });

  it("envía a todos los dispositivos y devuelve los que ya no existen", async () => {
    push.failWith.set("https://push.test/viejo", 410);
    push.failWith.set("https://push.test/caido", 500);
    const gone = await sendPush(
      [target("https://push.test/a"), target("https://push.test/viejo"), target("https://push.test/caido")],
      { title: "💬 Rokito", body: "hola", url: "/chat" },
    );
    expect(push.sent.map((s) => s.endpoint)).toEqual(["https://push.test/a"]);
    expect(gone).toEqual(["https://push.test/viejo"]);
  });

  it("recorta textos largos para no pasarse del tamaño máximo de un push", async () => {
    await sendPush([target("https://push.test/a")], { title: "t", body: "x".repeat(500), url: "/" });
    const body = (JSON.parse(push.sent[0]!.data) as { body: string }).body;
    expect(body.length).toBe(180);
    expect(body.endsWith("…")).toBe(true);
  });

  it("notifyPartner usa tu nombre, avisa solo a los destinos de tu pareja y limpia los caducados", async () => {
    push.partnerTargets = [target("https://push.test/giselz-movil"), target("https://push.test/giselz-viejo")];
    push.failWith.set("https://push.test/giselz-viejo", 404);

    await notifyPartner((me) => ({ title: `🥰 ${me}`, body: "Te quiero", url: "/inicio" }));
    await Promise.all(push.afterTasks);

    expect(push.sent).toHaveLength(1);
    expect(push.sent[0]!.endpoint).toBe("https://push.test/giselz-movil");
    expect(JSON.parse(push.sent[0]!.data)).toMatchObject({ title: "🥰 Rokito", body: "Te quiero", url: "/inicio" });
    expect(push.rpcCalls).toContainEqual({
      fn: "forget_partner_push_subscription",
      args: { p_endpoint: "https://push.test/giselz-viejo" },
    });
  });
});

describe("Suscripciones", () => {
  it("guarda una suscripción válida", async () => {
    const res = await saveSubscription({
      endpoint: "https://web.push.apple.com/abc",
      keys: { p256dh: "clave", auth: "auth" },
    });
    expect(res.error).toBeNull();
    expect(push.rpcCalls).toContainEqual({
      fn: "save_push_subscription",
      args: { p_endpoint: "https://web.push.apple.com/abc", p_p256dh: "clave", p_auth: "auth" },
    });
  });

  it("rechaza suscripciones manipuladas", async () => {
    for (const bad of [
      null,
      { endpoint: "javascript:alert(1)", keys: { p256dh: "k", auth: "a" } },
      { endpoint: "http://inseguro.test/x", keys: { p256dh: "k", auth: "a" } },
      { endpoint: "https://ok.test/x", keys: { p256dh: "", auth: "a" } },
      { endpoint: "https://ok.test/x" },
    ]) {
      expect((await saveSubscription(bad)).error).toBe("Suscripción no válida.");
    }
    expect(push.rpcCalls).toHaveLength(0);
  });

  it("la notificación de prueba te llega a ti", async () => {
    const res = await sendTestNotification();
    expect(res.error).toBeNull();
    expect(push.sent.map((s) => s.endpoint)).toEqual(["https://push.test/mio"]);
  });

  it("sin clave en Vercel avisa de que falta configurarla", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect((await sendTestNotification()).error).toMatch(/Falta configurar/);
  });
});
