"use client";

import { useEffect } from "react";

/**
 * Que la app no se amplíe como una web. En iPhone, Safari no siempre hace
 * caso a `user-scalable=no` del viewport: el pellizco con dos dedos llega
 * como "gesturestart/gesturechange" y aquí se anula. Las fotos a pantalla
 * completa y el editor de recorte tienen su propio zoom (con pointer
 * events), que no depende de esto.
 */
export function NoZoom() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"] as const;
    for (const name of events) document.addEventListener(name, prevent, { passive: false });
    return () => {
      for (const name of events) document.removeEventListener(name, prevent);
    };
  }, []);
  return null;
}
