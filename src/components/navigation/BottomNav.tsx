"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MessageCircleHeart, NotebookPen, Sparkles, UserRound } from "lucide-react";
import type { ComponentType } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const TABS: Tab[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircleHeart },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/notas", label: "Notas", icon: NotebookPen },
  { href: "/juegos", label: "Juegos", icon: Sparkles },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

// Barra flotante tipo "globo": una píldora translúcida separada de los
// bordes. Su altura total debe coincidir con --nav-height (globals.css):
// 52px de botón + 2×6px de relleno + 2×1px de borde = 66px.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-md px-3"
      style={{ bottom: "var(--nav-gap)" }}
    >
      <ul
        className="pointer-events-auto flex items-center justify-between rounded-[26px] border p-1.5 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 96%, transparent)",
          borderColor: "var(--color-line)",
          boxShadow:
            "0 14px 34px -14px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 4px 14px -6px rgba(0, 0, 0, 0.18)",
        }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10.5px] font-medium transition-all duration-200"
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-muted)",
                  background: isActive
                    ? "color-mix(in srgb, var(--color-accent) 13%, transparent)"
                    : "transparent",
                  fontWeight: isActive ? 700 : 500,
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
