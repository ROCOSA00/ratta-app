"use client";

import { Play } from "lucide-react";
import { useTour } from "./Tour";

export function StartTourButton() {
  const { start } = useTour();
  return (
    <button
      type="button"
      onClick={start}
      className="mx-5 flex items-center gap-3 rounded-2xl p-4 text-left text-white shadow-lg"
      style={{ backgroundImage: "var(--color-gradient)" }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Play size={18} />
      </span>
      <span>
        <span className="block text-sm font-bold">Tutorial interactivo</span>
        <span className="block text-xs text-white/90">Te llevo por la app tocando cada cosa. 1 minuto.</span>
      </span>
    </button>
  );
}
