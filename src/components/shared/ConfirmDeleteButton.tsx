"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  confirmMessage,
  label = "Borrar",
}: {
  confirmMessage: string;
  label?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="shrink-0 rounded-full p-1.5"
      style={{ color: "var(--color-muted)" }}
    >
      <Trash2 size={15} />
    </button>
  );
}
