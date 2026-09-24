"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { RattaLogo } from "@/components/shared/RattaLogo";
import { findStatus } from "@/lib/status/options";

export type MemberCardPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  statusKey: string | null;
  statusNote: string | null;
};

type Props = {
  person: MemberCardPerson;
  /** Nombre de la pareja, para la firma del reverso. */
  partnerName: string;
  /** "06·03·2026" */
  sinceLabel: string;
  daysTogether: number;
  onClose: () => void;
};

/** Nº de socia/o a partir del id: RAT-3F9A. */
function memberNumber(id: string): string {
  return `RAT-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Línea tipo pasaporte (MRZ): IDRAT<<GISELZ<<<<… */
function mrzLine(name: string, id: string, since: string): [string, string] {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "<");
  const first = `IDRAT<<${clean}`.padEnd(30, "<").slice(0, 30);
  const second = `${memberNumber(id).replace("-", "")}<${since.replace(/\D/g, "")}<ESP<<LOVE`.padEnd(30, "<").slice(0, 30);
  return [first, second];
}

const QR = 13;

/**
 * Un "código QR" decorativo de 13×13 hecho con el id (siempre el mismo por
 * persona): las tres esquinas típicas y el resto pseudoaleatorio.
 */
function qrCells(id: string): boolean[] {
  let seed = 0;
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [
      [0, 0],
      [0, QR - 5],
      [QR - 5, 0],
    ] as const) {
      const y = r - fr;
      const x = c - fc;
      if (y >= 0 && y < 5 && x >= 0 && x < 5) {
        return y === 0 || y === 4 || x === 0 || x === 4 || (y === 2 && x === 2);
      }
    }
    return null;
  };
  return Array.from({ length: QR * QR }, (_, i) => finder(Math.floor(i / QR), i % QR) ?? next() > 0.5);
}

/**
 * Carnet de Ratta holográfico: una tarjeta en 3D que se gira arrastrando y
 * se da la vuelta tocándola. El brillo holográfico se mueve con el giro.
 */
export function MemberCard({ person, partnerName, sinceLabel, daysTogether, onClose }: Props) {
  // Giro actual (grados). rotY libre (vueltas completas); rotX limitado.
  const [rot, setRot] = useState({ x: -6, y: -12 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number; moved: boolean } | null>(null);
  const status = findStatus(person.statusKey);
  const [mrz1, mrz2] = mrzLine(person.name, person.id, sinceLabel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y, moved: false };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    setRot({ x: Math.max(-28, Math.min(28, d.rx - dy * 0.35)), y: d.ry + dx * 0.6 });
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    // Un toque sin arrastrar: darle la vuelta. Al soltar: quedarse de frente
    // o de espaldas, lo que esté más cerca, con un pequeño balanceo.
    setRot((r) => {
      const nearest = Math.round(r.y / 180) * 180;
      return { x: -6, y: d.moved ? nearest : nearest + 180 };
    });
  }

  // Posición del brillo holográfico según el giro (0-100 %).
  const shineX = 50 + Math.sin((rot.y * Math.PI) / 180) * 45;
  const shineY = 50 + rot.x * 1.5;
  const holo = { "--mx": `${shineX}%`, "--my": `${shineY}%` } as React.CSSProperties;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Carnet de Ratta de ${person.name}`}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 p-5"
      style={{ background: "rgba(8, 3, 10, 0.78)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <X size={20} />
      </button>

      <div className="member-float w-full max-w-[360px]" style={{ perspective: 1100 }} onClick={(e) => e.stopPropagation()}>
        <div
          className="relative aspect-[1.586] w-full cursor-grab select-none active:cursor-grabbing"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            transition: dragging ? "none" : "transform 700ms cubic-bezier(0.22, 1.2, 0.36, 1)",
            touchAction: "none",
            ...holo,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* ---------------- Anverso ---------------- */}
          <div className="member-face member-front absolute inset-0 overflow-hidden rounded-[18px]">
            <div className="member-holo" />
            <div className="relative flex h-full flex-col p-[4.5%] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RattaLogo className="h-5 w-5" />
                  <div className="leading-none">
                    <p className="text-[11px] font-black tracking-[0.2em]">RATTA</p>
                    <p className="text-[6.5px] font-semibold tracking-[0.12em] opacity-80">DOCUMENTO NACIONAL DE RATA</p>
                  </div>
                </div>
                <span className="member-badge rounded-full px-2 py-0.5 text-[7.5px] font-black tracking-[0.14em]">
                  OFFICIAL MEMBER
                </span>
              </div>

              <div className="mt-[3.5%] flex flex-1 gap-[4%]">
                <div className="relative aspect-[3/4] h-full shrink-0 overflow-hidden rounded-lg border border-white/40 bg-white/15">
                  {person.avatarUrl ? (
                    <Image src={person.avatarUrl} alt="" fill sizes="120px" unoptimized className="object-cover" draggable={false} />
                  ) : (
                    <span className="flex h-full items-center justify-center text-3xl">🐀</span>
                  )}
                  <div className="member-photo-holo" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                  <Field label="NOMBRE / NAME" value={person.name} big />
                  <Field label="CATEGORÍA" value="Rata oficial 🐀" />
                  <Field label="MIEMBRO DESDE" value={sinceLabel} />
                  <Field label="ESTADO" value={status ? `${status.emoji} ${status.label}` : "—"} />
                  <Field label="Nº SOCIA/O" value={memberNumber(person.id)} mono />
                </div>
              </div>

              <div className="mt-[2.5%] rounded bg-black/20 px-1.5 py-1 font-mono text-[7.5px] leading-tight tracking-[0.12em] opacity-90">
                <p className="truncate">{mrz1}</p>
                <p className="truncate">{mrz2}</p>
              </div>
            </div>
          </div>

          {/* ---------------- Reverso ---------------- */}
          <div className="member-face member-back absolute inset-0 overflow-hidden rounded-[18px]" style={{ transform: "rotateY(180deg)" }}>
            {person.coverUrl ? (
              <Image src={person.coverUrl} alt="" fill sizes="360px" unoptimized className="object-cover opacity-55" draggable={false} />
            ) : null}
            <div className="member-holo" />
            <div className="relative flex h-full flex-col justify-between p-[4.5%] text-white">
              <div className="flex items-start justify-between">
                <span className="member-chip" aria-hidden />
                <div className="text-right leading-tight">
                  <p className="font-mono text-2xl font-black">{daysTogether}</p>
                  <p className="text-[8px] font-bold tracking-[0.14em] opacity-85">DÍAS JUNTOS 💞</p>
                </div>
              </div>

              <div className="rounded-lg bg-black/25 p-2 text-[8.5px] leading-snug">
                <p className="font-bold tracking-[0.12em] opacity-80">VÁLIDO PARA</p>
                <p>Mimos ilimitados · Besos sin límite · Acceso VIP al Trono 👑</p>
                {person.statusNote ? <p className="mt-1 italic opacity-90">«{person.statusNote}»</p> : null}
              </div>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[7px] font-bold tracking-[0.14em] opacity-75">FIRMA DEL TITULAR</p>
                  <p className="member-signature text-xl leading-none">
                    {person.name} ♥ {partnerName}
                  </p>
                </div>
                <div
                  className="grid shrink-0 rounded bg-white p-1"
                  style={{ gridTemplateColumns: `repeat(${QR}, 3px)` }}
                  aria-hidden
                >
                  {qrCells(person.id).map((on, i) => (
                    <span key={i} className="h-[3px] w-[3px]" style={{ background: on ? "#1b1216" : "transparent" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-white/75" onClick={(e) => e.stopPropagation()}>
        Arrastra para girarlo · toca para darle la vuelta
      </p>
    </div>
  );
}

function Field({ label, value, big, mono }: { label: string; value: string; big?: boolean; mono?: boolean }) {
  return (
    <div className="min-w-0 leading-tight">
      <p className="text-[6.5px] font-bold tracking-[0.14em] opacity-70">{label}</p>
      <p className={`truncate font-bold ${big ? "text-[15px]" : "text-[10.5px]"} ${mono ? "font-mono tracking-wider" : ""}`}>
        {value}
      </p>
    </div>
  );
}
