"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images/resize";
import { createCapsule } from "@/lib/capsules/actions";
import { CAPSULE_BUCKET, CAPSULE_LIMITS, shortDate } from "@/lib/capsules/config";
import { addDays } from "@/lib/calendar/date-utils";
import { PickerField } from "@/components/shared/PickerField";

const fieldStyle = { background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" };

export function CapsuleForm({
  spaceId,
  today,
  options,
}: {
  spaceId: string;
  today: string;
  options: { label: string; date: string }[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hint, setHint] = useState("");
  const [openOn, setOpenOn] = useState(options[0]?.date ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let photoPath: string | undefined;
    if (file) {
      let blob: Blob;
      try {
        blob = await resizeImage(file, 1600);
      } catch {
        setSaving(false);
        setError("No se pudo leer esa imagen. Prueba con otra.");
        return;
      }
      photoPath = `${spaceId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(CAPSULE_BUCKET)
        .upload(photoPath, blob, { contentType: "image/jpeg" });
      if (uploadError) {
        setSaving(false);
        setError("No se pudo subir la foto. Inténtalo de nuevo.");
        return;
      }
    }

    const result = await createCapsule({ title, body, openOn, hint, photoPath });
    if (result.error) {
      // Que no quede una foto huérfana en el almacén si no se pudo guardar.
      if (photoPath) await supabase.storage.from(CAPSULE_BUCKET).remove([photoPath]);
      setSaving(false);
      setError(result.error);
      return;
    }
    router.push("/capsulas");
  }

  const tomorrow = addDays(today, 1);

  return (
    <form
      onSubmit={save}
      className="mx-5 flex flex-col gap-4 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          ¿Cuándo se abre?
        </span>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const active = o.date === openOn;
            return (
              <button
                key={o.date}
                type="button"
                aria-pressed={active}
                onClick={() => setOpenOn(o.date)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: active ? "var(--color-accent)" : "var(--color-bg)",
                  borderColor: active ? "var(--color-accent)" : "var(--color-line)",
                  color: active ? "#ffffff" : "var(--color-ink)",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <label className="mt-1 flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
          O el día que quieras:
          <PickerField
            type="date"
            required
            value={openOn}
            min={tomorrow}
            onChange={setOpenOn}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            style={fieldStyle}
            placeholder="Elige el día"
            wrapperClassName="flex-1"
          />
        </label>
        {openOn ? (
          <p className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
            🔒 Cerrada hasta el {shortDate(openOn)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="capsule-title" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Título
        </label>
        <input
          id="capsule-title"
          required
          maxLength={CAPSULE_LIMITS.title}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Para nuestro primer aniversario"
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={fieldStyle}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="capsule-body" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Tu carta
        </label>
        <textarea
          id="capsule-body"
          required
          rows={9}
          maxLength={CAPSULE_LIMITS.body}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Querida rata…"
          className="resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none"
          style={fieldStyle}
        />
        <p className="text-right text-[11px]" style={{ color: "var(--color-muted)" }}>
          {body.length} / {CAPSULE_LIMITS.body}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Foto (opcional)
        </span>
        {preview ? (
          <div className="relative w-fit">
            <Image
              src={preview}
              alt=""
              width={160}
              height={160}
              unoptimized
              className="h-40 w-40 rounded-xl object-cover"
            />
            <button
              type="button"
              aria-label="Quitar foto"
              onClick={() => {
                setFile(null);
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm"
            style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
          >
            <ImagePlus size={16} />
            Añadir una foto
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="capsule-hint" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Pista para tu pareja (opcional, se ve antes de abrirla)
        </label>
        <input
          id="capsule-hint"
          maxLength={CAPSULE_LIMITS.hint}
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Ábrela con un café ☕"
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={fieldStyle}
        />
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <Send size={16} />
        {saving ? "Cerrando el sobre…" : "Guardar en la cápsula"}
      </button>
    </form>
  );
}

