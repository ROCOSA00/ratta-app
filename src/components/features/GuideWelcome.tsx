"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

// Solo una comodidad de este dispositivo (recordar que ya viste la guía):
// si el almacenamiento no está disponible, el aviso simplemente vuelve a salir.
const STORAGE_KEY = "ratta:guide-seen";

function markSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Navegación privada o almacenamiento bloqueado: no pasa nada.
  }
}

function hasSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function GuideWelcome({ name }: { name?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasSeen());
  }, []);

  if (!visible) return null;

  return (
    <div
      className="relative mx-5 rounded-2xl p-4 text-white shadow-lg"
      style={{ backgroundImage: "var(--color-gradient)" }}
    >
      <button
        type="button"
        onClick={() => {
          markSeen();
          setVisible(false);
        }}
        aria-label="Cerrar"
        className="absolute right-2 top-2 rounded-full p-1.5 text-white/80"
      >
        <X size={16} />
      </button>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles size={16} /> {name ? `¡Hola, ${name}! Esto es Ratta` : "¡Hola! Esto es Ratta"}
      </p>
      <p className="mt-1 pr-6 text-sm text-white/90">
        Vuestro rincón para dos. ¿Te enseño en un minuto qué es cada cosa?
      </p>
      <Link
        href="/perfil/guia"
        className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold"
        style={{ color: "var(--color-accent)" }}
      >
        Ver cómo funciona
      </Link>
    </div>
  );
}

/** Se monta en la página de la guía: haberla abierto cuenta como vista. */
export function MarkGuideSeen() {
  useEffect(() => {
    markSeen();
  }, []);
  return null;
}
