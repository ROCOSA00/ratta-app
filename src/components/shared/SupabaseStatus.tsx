"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "connected" | "error";

/**
 * Comprobación visual temporal de la Fase 3. La sustituirá el dashboard
 * real de la Fase 10.
 */
export function SupabaseStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        setStatus("connected");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Error desconocido");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const copy: Record<Status, string> = {
    checking: "Comprobando conexión con Supabase…",
    connected: "Conectado a Supabase",
    error: message ? `Error de conexión: ${message}` : "Error de conexión con Supabase",
  };

  const colors: Record<Status, { bg: string; text: string }> = {
    checking: {
      bg: "color-mix(in srgb, var(--color-ink) 6%, var(--color-surface))",
      text: "var(--color-muted)",
    },
    connected: {
      bg: "color-mix(in srgb, #22c55e 15%, var(--color-surface))",
      text: "#16a34a",
    },
    error: {
      bg: "color-mix(in srgb, var(--color-danger) 15%, var(--color-surface))",
      text: "var(--color-danger)",
    },
  };

  return (
    <div
      className="mx-5 mt-4 rounded-xl border px-4 py-3 text-center text-xs font-medium"
      style={{
        background: colors[status].bg,
        color: colors[status].text,
        borderColor: "var(--color-line)",
      }}
    >
      {copy[status]}
    </div>
  );
}
