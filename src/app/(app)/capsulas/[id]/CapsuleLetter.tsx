"use client";

import { useState } from "react";
import Image from "next/image";
import { markCapsuleOpened } from "@/lib/capsules/actions";

/**
 * La carta. Si quien la recibe la abre por primera vez, primero ve el sobre
 * cerrado y al tocar «Abrir» se abre (y se avisa a quien la escribió).
 */
export function CapsuleLetter({
  capsuleId,
  title,
  body,
  photoUrl,
  author,
  writtenOn,
  sealed,
  notice,
}: {
  capsuleId: string;
  title: string;
  body: string;
  photoUrl: string | null;
  author: string;
  writtenOn: string;
  sealed: boolean;
  notice: string | null;
}) {
  const [stage, setStage] = useState<"sealed" | "opening" | "open">(sealed ? "sealed" : "open");

  function open() {
    setStage("opening");
    void markCapsuleOpened(capsuleId);
    window.setTimeout(() => setStage("open"), 900);
  }

  if (stage !== "open") {
    return (
      <div className="mx-5 flex flex-col items-center gap-5 text-center">
        <div className={`capsule-envelope ${stage === "opening" ? "is-opening" : "capsule-wiggle"}`} aria-hidden>
          <span className="capsule-flap" />
          <span className="capsule-seal">💌</span>
        </div>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {author} te escribió esta carta el {writtenOn}. ¡Hoy por fin se puede abrir!
        </p>
        <button
          type="button"
          onClick={open}
          disabled={stage === "opening"}
          className="rounded-2xl px-8 py-3 text-sm font-semibold text-white disabled:opacity-70"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          {stage === "opening" ? "Abriendo…" : "Abrir la carta"}
        </button>
      </div>
    );
  }

  return (
    <article className="capsule-letter mx-5 rounded-2xl border p-5" style={{ borderColor: "var(--color-line)" }}>
      {notice ? (
        <p className="mb-4 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "var(--color-line)", color: "var(--color-ink)" }}>
          {notice}
        </p>
      ) : null}
      <h2 className="text-lg font-bold leading-snug" style={{ color: "var(--color-ink)" }}>
        {title}
      </h2>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: "var(--color-ink)" }}>
        {body}
      </p>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          width={800}
          height={800}
          unoptimized
          className="mt-4 h-auto w-full rounded-xl"
        />
      ) : null}
      <p className="member-signature mt-5 text-right text-2xl" style={{ color: "var(--color-accent)" }}>
        — {author} ♥
      </p>
      <p className="mt-1 text-right text-xs" style={{ color: "var(--color-muted)" }}>
        Escrita el {writtenOn}
      </p>
    </article>
  );
}
