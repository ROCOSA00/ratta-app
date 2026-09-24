"use client";

import { useState, useTransition } from "react";
import { updateStatus } from "@/lib/profile/actions";
import { STATUS_OPTIONS } from "@/lib/status/options";

/** Elegir tu estado de ánimo (lo ve tu pareja en el chat y en tu carnet). */
export function StatusPicker({ currentKey, currentNote }: { currentKey: string | null; currentNote: string | null }) {
  const [selected, setSelected] = useState<string | null>(currentKey);
  const [note, setNote] = useState(currentNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const dirty = selected !== currentKey || note !== (currentNote ?? "");

  function save(key: string | null) {
    setMessage(null);
    startSaving(async () => {
      const result = await updateStatus({ key, note: key ? note : "" });
      setMessage(result.error ?? (key ? "¡Estado guardado! Tu pareja ya lo ve 💞" : "Estado quitado."));
      if (!key) setNote("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_OPTIONS.map((o) => {
          const active = o.key === selected;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(active ? null : o.key)}
              className="flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center"
              style={{
                background: active ? "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))" : "var(--color-bg)",
                borderColor: active ? "var(--color-accent)" : "var(--color-line)",
              }}
            >
              <span className="text-xl leading-none">{o.emoji}</span>
              <span
                className="text-[10px] font-semibold leading-tight"
                style={{ color: active ? "var(--color-accent)" : "var(--color-muted)" }}
              >
                {/* Deja partir la línea tras la barra: «Desatendido/ a». */}
                {o.label.replace("/", "/\u200b")}
              </span>
            </button>
          );
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={60}
        disabled={!selected}
        placeholder={selected ? "Añade algo (opcional): «en el tren, pensando en ti»" : "Elige primero un estado"}
        className="rounded-xl border px-3 py-2.5 text-sm outline-none disabled:opacity-60"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      />

      <div className="flex gap-2">
        {currentKey ? (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              save(null);
            }}
            disabled={isSaving}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
          >
            Quitar estado
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => save(selected)}
          disabled={isSaving || !selected || !dirty}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          {isSaving ? "Guardando…" : "Guardar estado"}
        </button>
      </div>

      {message ? (
        <p className="text-center text-xs font-medium" style={{ color: "var(--color-accent)" }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
