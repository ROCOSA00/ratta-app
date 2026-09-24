"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantiene la pantalla al día sin recargar a mano.
 *
 * - Al volver a la app (la app instalada se queda en segundo plano con la
 *   página que tenías abierta), pide los datos otra vez al servidor. Sin
 *   esto, Inicio seguía enseñando lo de cuando lo abriste (p. ej. El Trono
 *   no reflejaba lo que había registrado tu pareja).
 * - Con `everyMs`, además, cada cierto tiempo mientras la estás mirando.
 *
 * router.refresh() conserva lo que estés escribiendo en los formularios.
 */
export function AutoRefresh({ everyMs }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt > 2000) {
        hiddenAt = null;
        router.refresh();
      }
    };
    // Safari puede restaurar la página desde su caché al volver atrás.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    const timer = everyMs
      ? window.setInterval(() => {
          if (!document.hidden) router.refresh();
        }, everyMs)
      : null;

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [router, everyMs]);

  return null;
}
