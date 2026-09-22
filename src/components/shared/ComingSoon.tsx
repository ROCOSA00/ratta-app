import type { ComponentType } from "react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div
      className="mx-5 flex flex-col items-center gap-3 rounded-2xl border p-8 text-center"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
          color: "var(--color-accent)",
        }}
      >
        <Icon size={24} strokeWidth={2} />
      </span>
      <h2 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
        {title}
      </h2>
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        {description}
      </p>
      <span
        className="mt-1 rounded-full px-3 py-1 text-xs font-medium"
        style={{
          background: "color-mix(in srgb, var(--color-ink) 6%, var(--color-surface))",
          color: "var(--color-muted)",
        }}
      >
        {phase}
      </span>
    </div>
  );
}
