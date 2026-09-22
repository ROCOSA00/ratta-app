export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header
      className="sticky z-30 border-b px-5 pb-4"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        background: "var(--color-bg)",
        borderColor: "var(--color-line)",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)",
      }}
    >
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
