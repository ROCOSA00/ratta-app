import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
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
      {backHref ? (
        <Link
          href={backHref}
          className="mb-1 flex items-center gap-0.5 text-sm font-medium"
          style={{ color: "var(--color-muted)" }}
        >
          <ChevronLeft size={16} />
          Volver
        </Link>
      ) : null}
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
