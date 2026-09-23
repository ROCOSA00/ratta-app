"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteBar({
  confirmMessage,
  label = "Borrar",
}: {
  confirmMessage: string;
  label?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium"
      style={{
        color: "var(--color-danger)",
        background: "color-mix(in srgb, var(--color-danger) 10%, var(--color-surface))",
      }}
    >
      <Trash2 size={15} />
      {label}
    </button>
  );
}
