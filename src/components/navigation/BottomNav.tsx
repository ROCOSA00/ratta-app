"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MoreHorizontal, NotebookPen, Sparkles } from "lucide-react";
import type { ComponentType } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const TABS: Tab[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/notas", label: "Notas", icon: NotebookPen },
  { href: "/juegos", label: "Juegos", icon: Sparkles },
  { href: "/mas", label: "Más", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-line)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-muted)",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
