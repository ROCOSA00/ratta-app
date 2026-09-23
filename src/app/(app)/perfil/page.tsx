import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookHeart, ChevronRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { QuestionOfTheDay } from "@/components/features/QuestionOfTheDay";
import { RenameForm } from "./RenameForm";
import { AvatarUpload } from "./AvatarUpload";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function MasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let avatarUrl: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    displayName = (profile?.display_name as string | undefined) ?? "";
    avatarUrl = (profile?.avatar_url as string | null | undefined) ?? null;
  }

  return (
    <>
      <PageHeader title="Más" subtitle="Pregunta del día y ajustes" />

      <Link
        href="/mas/guia"
        className="mx-5 mt-5 flex items-center gap-3 rounded-2xl border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 7%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent) 20%, var(--color-line))",
        }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 18%, var(--color-surface))",
            color: "var(--color-accent)",
          }}
        >
          <BookHeart size={17} strokeWidth={2.3} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            Cómo funciona Ratta
          </span>
          <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
            Una vuelta rápida por todo
          </span>
        </span>
        <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
      </Link>

      <div
        className="mx-5 mt-4 flex flex-col gap-4 rounded-2xl border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent-2) 6%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-line))",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm" style={{ color: "var(--color-ink)" }}>
            {user?.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                color: "var(--color-danger)",
                background: "color-mix(in srgb, var(--color-danger) 12%, var(--color-surface))",
              }}
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </form>
        </div>

        {user ? <AvatarUpload userId={user.id} currentAvatarUrl={avatarUrl} /> : null}

        <RenameForm currentName={displayName} />

        <ChangePasswordForm />
      </div>

      <div className="mt-5">
        <QuestionOfTheDay />
      </div>
    </>
  );
}
