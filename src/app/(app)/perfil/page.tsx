import Link from "next/link";
import Image from "next/image";
import type { ComponentType, ReactNode } from "react";
import { Bell, BookHeart, ChevronRight, Images, KeyRound, LogOut, UserPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { getTogetherInfo } from "@/lib/couple";
import { RenameForm } from "./RenameForm";
import { AvatarUpload } from "./AvatarUpload";
import { CoverUpload } from "./CoverUpload";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { NotificationSettings } from "./NotificationSettings";

type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null; cover_url: string | null };

function Card({ icon: Icon, tint, title, children }: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tint: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="mx-5 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: tint }}>
        <Icon size={14} strokeWidth={2.3} />
        {title}
      </p>
      {children}
    </section>
  );
}

function LinkRow({ href, icon: Icon, tint, title, subtitle }: {
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tint: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="mx-5 flex items-center gap-3 rounded-2xl border p-4"
      style={{
        background: `color-mix(in srgb, ${tint} 7%, var(--color-surface))`,
        borderColor: `color-mix(in srgb, ${tint} 20%, var(--color-line))`,
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`, color: tint }}
      >
        <Icon size={18} strokeWidth={2.3} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          {title}
        </span>
        <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </span>
      </span>
      <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
    </Link>
  );
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La RLS de profiles devuelve tu perfil y el de tu pareja, nada más.
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, cover_url");
  const profiles = (data ?? []) as ProfileRow[];
  const me = profiles.find((p) => p.id === user?.id);
  const partner = profiles.find((p) => p.id !== user?.id);
  const together = getTogetherInfo();

  return (
    <>
      <div className="relative h-52 w-full overflow-hidden">
        {me?.cover_url ? (
          <Image src={me.cover_url} alt="Tu foto de portada" fill priority sizes="448px" className="object-cover" />
        ) : (
          <div className="h-full w-full" style={{ backgroundImage: "var(--color-gradient)" }} />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 45%, var(--color-bg) 100%)" }}
        />
        {user ? (
          <div className="absolute right-4" style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
            <CoverUpload userId={user.id} />
          </div>
        ) : null}
      </div>

      <div className="relative -mt-16 flex flex-col items-center gap-1 px-5 text-center">
        {user ? <AvatarUpload userId={user.id} currentAvatarUrl={me?.avatar_url ?? null} /> : null}
        <h1 className="mt-1 text-2xl" style={{ color: "var(--color-ink)" }}>
          {me?.display_name || "Tu perfil"}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {user?.email}
        </p>
        {partner?.display_name ? (
          <p
            className="mt-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              color: "var(--color-accent)",
              background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
            }}
          >
            💞 {together.days} días con {partner.display_name}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-4 pb-4">
        <LinkRow
          href="/recuerdos"
          icon={Images}
          tint="var(--color-accent-2)"
          title="Recuerdos"
          subtitle="Vuestras fotos juntos"
        />
        <LinkRow
          href="/perfil/guia"
          icon={BookHeart}
          tint="var(--color-accent)"
          title="Cómo funciona Ratta"
          subtitle="Una vuelta rápida por todo"
        />

        <Card icon={Bell} tint="var(--color-accent)" title="Notificaciones">
          <NotificationSettings />
        </Card>

        <Card icon={UserPen} tint="var(--color-accent-2)" title="Tu nombre">
          <RenameForm currentName={me?.display_name ?? ""} />
        </Card>

        <Card icon={KeyRound} tint="var(--color-accent-2)" title="Seguridad">
          <ChangePasswordForm />
        </Card>

        <form action={signOut} className="mx-5">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{
              color: "var(--color-danger)",
              background: "color-mix(in srgb, var(--color-danger) 10%, var(--color-surface))",
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
