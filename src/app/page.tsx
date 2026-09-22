export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold"
        style={{ background: "var(--color-accent)", color: "var(--color-accent-ink)" }}
        aria-hidden
      >
        R
      </span>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--color-ink)" }}>
          Ratta App
        </h1>
        <p className="text-base" style={{ color: "var(--color-muted)" }}>
          Nuestro pequeño mundo para dos.
        </p>
      </div>

      <div
        className="w-full rounded-2xl border p-4 text-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-line)",
          color: "var(--color-muted)",
        }}
      >
        Fase 1 completada: el proyecto arranca correctamente con Next.js,
        TypeScript y Tailwind. La navegación, el login y los módulos llegan en
        las próximas fases.
      </div>
    </main>
  );
}
