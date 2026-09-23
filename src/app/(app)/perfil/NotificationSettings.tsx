"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { VAPID_PUBLIC_KEY } from "@/lib/push/config";
import { removeSubscription, saveSubscription, sendTestNotification } from "@/lib/push/actions";

type Status = "loading" | "needs-install" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // En iPhone, las notificaciones web solo existen con la app instalada.
        setStatus(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (existing && Notification.permission === "granted") {
        // Se vuelve a guardar por si en el servidor se hubiera perdido.
        await saveSubscription(existing.toJSON());
        setStatus("on");
      } else {
        setStatus("off");
      }
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      // Tiene que pedirse dentro del toque del usuario (iOS lo exige).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const result = await saveSubscription(subscription.toJSON());
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setStatus("on");
    } catch {
      setMessage("No se pudieron activar. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const result = await sendTestNotification();
    setMessage(result.error ?? "Enviada. Debería llegarte en unos segundos. 🔔");
    setBusy(false);
  }

  const muted = { color: "var(--color-muted)" };
  const primary = { backgroundImage: "var(--color-gradient)" };

  return (
    <div className="flex flex-col gap-3 text-sm">
      {status === "loading" ? <p style={muted}>Comprobando…</p> : null}

      {status === "needs-install" ? (
        <p style={muted}>
          En el iPhone, las notificaciones solo funcionan con Ratta instalada: en Safari toca <b>Compartir</b> →{" "}
          <b>Añadir a pantalla de inicio</b>, ábrela desde el icono y vuelve aquí.
        </p>
      ) : null}

      {status === "unsupported" ? (
        <p style={muted}>Este navegador no admite notificaciones. En iPhone necesitas iOS 16.4 o posterior.</p>
      ) : null}

      {status === "denied" ? (
        <p style={muted}>
          Las notificaciones están bloqueadas. Actívalas en <b>Ajustes → Notificaciones → Ratta</b> y vuelve aquí.
        </p>
      ) : null}

      {status === "off" ? (
        <>
          <p style={muted}>
            Te avisaremos cuando tu pareja te escriba, te mande cariño, añada un plan, una nota o un recuerdo, responda
            la pregunta del día o visite El Trono.
          </p>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white disabled:opacity-60"
            style={primary}
          >
            <BellRing size={16} />
            {busy ? "Activando…" : "Activar notificaciones"}
          </button>
        </>
      ) : null}

      {status === "on" ? (
        <>
          <p style={{ color: "var(--color-ink)" }}>✅ Activadas en este dispositivo.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="flex-1 rounded-xl px-3 py-2.5 font-semibold text-white disabled:opacity-60"
              style={primary}
            >
              Probar
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="flex-1 rounded-xl px-3 py-2.5 font-medium disabled:opacity-60"
              style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
            >
              Desactivar
            </button>
          </div>
        </>
      ) : null}

      {message ? <p style={muted}>{message}</p> : null}
    </div>
  );
}
