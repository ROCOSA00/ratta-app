import { RattaLogo } from "@/components/shared/RattaLogo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const { passwordChanged } = await searchParams;

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span
          className="flex h-20 w-20 items-center justify-center rounded-[26%] p-4 shadow-lg"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <RattaLogo className="h-full w-full text-white" />
        </span>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-ink)" }}>
            Ratta
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Nuestro pequeño mundo para dos.
          </p>
        </div>
      </div>

      {passwordChanged ? (
        <p
          className="mb-4 rounded-xl px-4 py-2.5 text-center text-sm font-medium"
          style={{
            background: "color-mix(in srgb, var(--color-accent-2) 12%, var(--color-surface))",
            color: "var(--color-accent-2)",
          }}
        >
          Contraseña actualizada. Entra con la nueva.
        </p>
      ) : null}

      <LoginForm />
    </div>
  );
}
