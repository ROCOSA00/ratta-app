"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, Check, Trash2 } from "lucide-react";
import { deleteWish, toggleWish } from "@/lib/wishes/actions";
import { findCategory, WISH_CATEGORIES, type Wish, type WishCategory } from "@/lib/wishes/options";
import { formatDate } from "@/lib/format-date";

type Filter = "pending" | "done";

export function WishList({ wishes, names }: { wishes: Wish[]; names: Record<string, string> }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [category, setCategory] = useState<WishCategory | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Tachar se ve al instante; si falla, vuelve a como estaba.
  const [optimistic, setOptimistic] = useOptimistic(
    wishes,
    (current, change: { id: string; done: boolean }) =>
      current.map((w) =>
        w.id === change.id
          ? { ...w, done_at: change.done ? new Date().toISOString() : null, done_by: change.done ? "me" : null }
          : w,
      ),
  );
  const [justDone, setJustDone] = useState<string | null>(null);

  function toggle(wish: Wish) {
    const done = !wish.done_at;
    setError(null);
    if (done) {
      // Se queda un momento a la vista, tachado, antes de irse a «Cumplidos».
      setJustDone(wish.id);
      window.setTimeout(() => setJustDone((current) => (current === wish.id ? null : current)), 1500);
    }
    startTransition(async () => {
      setOptimistic({ id: wish.id, done });
      const result = await toggleWish(wish.id, done);
      if (result.error) setError(result.error);
    });
  }

  const pending = optimistic.filter((w) => !w.done_at);
  const done = optimistic.filter((w) => w.done_at);
  const shown = (filter === "pending" ? optimistic.filter((w) => !w.done_at || w.id === justDone) : done).filter(
    (w) => category === "all" || w.category === category,
  );

  if (wishes.length === 0) {
    return (
      <div
        className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <span className="text-4xl">✨</span>
        <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          Aún no hay deseos
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Apuntad aquí sitios a los que ir, pelis que ver o cosas que hacer juntos. Cuando lo cumpláis, se tacha 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="mx-5 flex gap-1 rounded-xl p-1" style={{ background: "var(--color-line)" }}>
        {(
          [
            ["pending", `Pendientes · ${pending.length}`],
            ["done", `Cumplidos · ${done.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: filter === key ? "var(--color-surface)" : "transparent",
              color: filter === key ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-5 flex gap-1.5 overflow-x-auto pb-0.5">
        {[{ id: "all" as const, emoji: "", label: "Todos" }, ...WISH_CATEGORIES].map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c.id)}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: active ? "color-mix(in srgb, var(--color-accent) 16%, transparent)" : "transparent",
                color: active ? "var(--color-accent)" : "var(--color-muted)",
              }}
            >
              {c.emoji ? `${c.emoji} ` : ""}
              {c.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mx-5 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="mx-5 py-6 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          {filter === "pending" ? "¡Nada pendiente por aquí! 🎉" : "Todavía no habéis tachado ninguno."}
        </p>
      ) : (
        <ul className="mx-5 flex flex-col gap-2">
          {shown.map((wish) => {
            const cat = findCategory(wish.category);
            const isDone = !!wish.done_at;
            return (
              <li
                key={wish.id}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 ${justDone === wish.id && isDone ? "wish-done" : ""}`}
                style={{
                  background: isDone
                    ? "color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))"
                    : "var(--color-surface)",
                  borderColor: "var(--color-line)",
                }}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={isDone ? `Marcar «${wish.title}» como pendiente` : `Marcar «${wish.title}» como cumplido`}
                  onClick={() => toggle(wish)}
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isDone ? "var(--color-accent)" : "var(--color-line)",
                    background: isDone ? "var(--color-accent)" : "transparent",
                    color: "#ffffff",
                  }}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${isDone ? "line-through decoration-2 opacity-70" : ""}`}
                    style={{ color: "var(--color-ink)", textDecorationColor: "var(--color-accent)" }}
                  >
                    {cat.emoji} {wish.title}
                  </p>
                  {wish.note ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs" style={{ color: "var(--color-muted)" }}>
                      {wish.note}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {isDone && wish.done_at
                      ? `✅ Cumplido el ${formatDate(wish.done_at)}`
                      : names[wish.created_by] === "Tú"
                        ? "Lo apuntaste tú"
                        : `Lo apuntó ${names[wish.created_by] ?? "tu pareja"}`}
                  </p>
                  {!isDone ? (
                    <Link
                      href={`/calendario?view=month&titulo=${encodeURIComponent(wish.title)}#nuevo-plan`}
                      className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--color-accent-2) 12%, transparent)",
                        color: "var(--color-accent-2)",
                      }}
                    >
                      <CalendarPlus size={12} />
                      Hacerlo plan
                    </Link>
                  ) : null}
                </div>
                <form
                  action={deleteWish}
                  onSubmit={(e) => {
                    if (!window.confirm(`¿Borrar «${wish.title}» de la lista?`)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="wishId" value={wish.id} />
                  <button
                    type="submit"
                    aria-label={`Borrar «${wish.title}»`}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
