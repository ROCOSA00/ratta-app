"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { BookHeart, ChevronRight, Home, Monitor, Moon, Play, Sparkles, Sun, Type } from "lucide-react";
import { HOME_CARDS, type HomeCardId, type Prefs, type TextSize, type Theme } from "@/lib/prefs";
import { savePrefs } from "@/lib/prefs-client";
import { useTour } from "@/components/tour/Tour";

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;

function Section({ icon: Icon, title, children }: { icon: Icon; title: string; children: ReactNode }) {
  return (
    <section
      className="mx-5 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <p
        className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-accent)" }}
      >
        <Icon size={14} strokeWidth={2.3} />
        {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: Icon }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl p-1" style={{ background: "var(--color-bg)" }}>
      {options.map(({ value: v, label: l, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors"
            style={{
              background: active ? "var(--color-surface)" : "transparent",
              color: active ? "var(--color-accent)" : "var(--color-muted)",
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.12)" : undefined,
            }}
          >
            {Icon ? <Icon size={15} /> : null}
            {l}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {label}
        </span>
        {hint ? (
          <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
            {hint}
          </span>
        ) : null}
      </span>
      <span
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--color-accent)" : "var(--color-line)" }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left]"
          style={{ left: checked ? "calc(100% - 1.5rem)" : "0.25rem" }}
        />
      </span>
    </button>
  );
}

export function SettingsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [canVibrate, setCanVibrate] = useState(false);
  const { start } = useTour();

  useEffect(() => {
    setCanVibrate(typeof navigator !== "undefined" && "vibrate" in navigator);
  }, []);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  }

  function toggleHome(id: HomeCardId, visible: boolean) {
    const hidden = new Set(prefs.hiddenHome);
    if (visible) hidden.delete(id);
    else hidden.add(id);
    update({ hiddenHome: HOME_CARDS.map((c) => c.id).filter((c) => hidden.has(c)) });
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <Section icon={Sun} title="Tema">
        <Segmented<Theme>
          label="Tema"
          value={prefs.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: "system", label: "Auto", icon: Monitor },
            { value: "light", label: "Claro", icon: Sun },
            { value: "dark", label: "Oscuro", icon: Moon },
          ]}
        />
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          En «Auto», la app sigue el modo claro u oscuro de tu móvil.
        </p>
      </Section>

      <Section icon={Type} title="Tamaño de letra">
        <Segmented<TextSize>
          label="Tamaño de letra"
          value={prefs.textSize}
          onChange={(textSize) => update({ textSize })}
          options={[
            { value: "normal", label: "Normal" },
            { value: "large", label: "Grande" },
          ]}
        />
      </Section>

      <Section icon={Sparkles} title="Animaciones">
        <Toggle
          label="Reducir animaciones"
          hint="Quita el movimiento de la barra, los saltitos y los fundidos."
          checked={prefs.reduceMotion}
          onChange={(reduceMotion) => update({ reduceMotion })}
        />
        <Toggle
          label="Pantalla de carga al abrir"
          hint="El logo con la barra de progreso al abrir la app."
          checked={prefs.splash}
          onChange={(splash) => update({ splash })}
        />
        {canVibrate ? (
          <Toggle
            label="Vibración en los juegos"
            checked={prefs.haptics}
            onChange={(haptics) => update({ haptics })}
          />
        ) : null}
      </Section>

      <Section icon={Home} title="Tarjetas de Inicio">
        {HOME_CARDS.map((card) => (
          <Toggle
            key={card.id}
            label={card.label}
            checked={!prefs.hiddenHome.includes(card.id)}
            onChange={(visible) => toggleHome(card.id, visible)}
          />
        ))}
      </Section>

      <Section icon={Play} title="Tutorial">
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <Play size={16} /> Hacer el tutorial interactivo
        </button>
        <Link
          href="/perfil/guia"
          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
          style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}
        >
          <span className="flex items-center gap-2">
            <BookHeart size={16} style={{ color: "var(--color-accent)" }} /> Leer «Cómo funciona Ratta»
          </span>
          <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
        </Link>
      </Section>

      <p className="mx-5 text-center text-xs" style={{ color: "var(--color-muted)" }}>
        Los ajustes se guardan en este móvil: cada uno tiene los suyos.
      </p>
    </div>
  );
}
