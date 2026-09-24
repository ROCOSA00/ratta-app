"use client";

import { useState } from "react";
import { IdCard } from "lucide-react";
import { MemberCard, type MemberCardPerson } from "./MemberCard";

/** Botón para ver tu propio carnet de Ratta. */
export function MyCardButton(props: {
  person: MemberCardPerson;
  partnerName: string;
  sinceLabel: string;
  daysTogether: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <IdCard size={14} /> Ver mi carnet de Ratta
      </button>
      {open ? <MemberCard {...props} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
