"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images/resize";
import { ImageCropper } from "@/components/shared/ImageCropper";
import {
  addPetEvent,
  addPetPhoto,
  deletePetEvent,
  deletePetPhoto,
  deletePetWeight,
  setPetPhoto,
  setPetWeight,
  updatePet,
} from "@/lib/pets/actions";
import { ageLabel, humanYears, lifeStage, nextCelebration } from "@/lib/pets/age";
import { findKind, formatWeight, PET_BUCKET, PET_EVENT_KINDS, type PetEventKind } from "@/lib/pets/config";
import type { Pet, PetEvent, PetPhoto, PetWeight } from "@/lib/pets/get-pet";
import { dayLabel, daysBetween } from "@/lib/calendar/date-utils";
import { WeightChart } from "./WeightChart";
import { PickerField } from "@/components/shared/PickerField";

type Tab = "album" | "peso" | "diario";
type Run = (action: () => Promise<{ error: string | null }>, after?: () => void) => void;

const fieldStyle = { background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" };
const fmt = new Intl.NumberFormat("es-ES");

/** "7 semanas" de "7 semanas y 1 día": la edad corta para las fotos. */
function shortAge(born: string, day: string) {
  return ageLabel(born, day).split(" y ")[0];
}

export function PetView({
  spaceId,
  pet,
  weights,
  events,
  photos,
  today,
}: {
  spaceId: string;
  pet: Pet;
  weights: PetWeight[];
  events: PetEvent[];
  photos: PetPhoto[];
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("album");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run: Run = (action, after) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        after?.();
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-5 flex flex-col gap-4 pb-4">
      <Hero spaceId={spaceId} pet={pet} today={today} pending={isPending} run={run} />
      <Celebration pet={pet} today={today} />

      <div className="mx-5 flex gap-1 rounded-xl p-1" style={{ background: "var(--color-line)" }}>
        {(
          [
            ["album", `📸 Álbum · ${photos.length}`],
            ["peso", "⚖️ Peso"],
            ["diario", "🩺 Diario"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === key ? "var(--color-surface)" : "transparent",
              color: tab === key ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mx-5 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      {tab === "album" ? (
        <Album spaceId={spaceId} pet={pet} photos={photos} today={today} pending={isPending} run={run} />
      ) : null}
      {tab === "peso" ? <Weights pet={pet} weights={weights} today={today} pending={isPending} run={run} /> : null}
      {tab === "diario" ? <Diary pet={pet} events={events} today={today} pending={isPending} run={run} /> : null}
    </div>
  );
}

// ------------------------------------------------------------ Ficha

function Hero({
  spaceId,
  pet,
  today,
  pending,
  run,
}: {
  spaceId: string;
  pet: Pet;
  today: string;
  pending: boolean;
  run: Run;
}) {
  const [picked, setPicked] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);
  const [adoptedOn, setAdoptedOn] = useState(pet.adopted_on ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const days = daysBetween(pet.born_on, today);
  const home = pet.adopted_on ? daysBetween(pet.adopted_on, today) : null;
  const human = humanYears(pet.born_on, today);

  async function upload(blob: Blob) {
    setPicked(null);
    setUploading(true);
    const supabase = createClient();
    const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(PET_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    setUploading(false);
    run(async () => (error ? { error: "No se pudo subir la foto. Inténtalo de nuevo." } : setPetPhoto(pet.id, path)));
  }

  return (
    <div
      className="relative mx-5 overflow-hidden rounded-3xl p-5 text-center text-white shadow-lg"
      style={{ backgroundImage: "linear-gradient(150deg, #fdba74, #fb923c 45%, #f472b6)" }}
    >
      <span aria-hidden className="pet-paws" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={`Cambiar la foto de ${pet.name}`}
        className="relative mx-auto block h-32 w-32 disabled:opacity-60"
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full border-4 border-white/80 bg-white/30 shadow-xl">
          {pet.photoUrl ? (
            <Image src={pet.photoUrl} alt={pet.name} fill sizes="128px" unoptimized className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-6xl">{pet.emoji}</span>
          )}
        </span>
        <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-orange-500 shadow">
          <Camera size={16} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setPicked(file);
        }}
      />
      {picked ? (
        <ImageCropper
          file={picked}
          shape="circle"
          aspect={1}
          outputWidth={600}
          title={`Encuadra la foto de ${pet.name}`}
          onCancel={() => setPicked(null)}
          onConfirm={upload}
        />
      ) : null}
      {uploading ? <p className="relative mt-1 text-xs">Subiendo…</p> : null}

      <h2 className="relative mt-3 text-3xl font-black drop-shadow-sm">
        {pet.name} {pet.emoji}
      </h2>
      <p className="relative mt-0.5 text-lg font-semibold">{ageLabel(pet.born_on, today)}</p>
      <p className="relative mt-1 inline-block rounded-full bg-white/25 px-3 py-0.5 text-xs font-bold">
        {lifeStage(pet.born_on, today)}
      </p>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat value={fmt.format(days)} label={days === 1 ? "día en el mundo" : "días en el mundo"} />
        <Stat value={`≈ ${fmt.format(human)}`} label="años humanos" />
        <Stat
          value={home !== null ? fmt.format(home) : "—"}
          label={home !== null ? (home === 1 ? "día en casa" : "días en casa") : "días en casa"}
        />
      </div>
      <p className="relative mt-3 text-xs font-medium opacity-95">
        Nació el {dayLabel(pet.born_on)} {pet.born_on.slice(0, 4)}
        {pet.adopted_on ? ` · llegó a casa el ${dayLabel(pet.adopted_on)}` : ""}
      </p>

      {editing ? (
        <div className="relative mt-3 flex flex-col gap-2 rounded-2xl bg-white/90 p-3 text-left text-[#1b1216]">
          <label className="text-xs font-semibold">
            Nombre
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Día que llegó a casa
            <PickerField
              type="date"
              value={adoptedOn}
              min={pet.born_on}
              max={today}
              onChange={setAdoptedOn}
              className="rounded-xl border px-3 py-2 text-sm"
              placeholder="Elige el día"
              wrapperClassName="mt-1"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => updatePet(pet.id, { name, adoptedOn }), () => setEditing(false))}
              className="flex-1 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold"
        >
          <Pencil size={12} />
          {pet.adopted_on ? "Editar" : "¿Cuándo llegó a casa?"}
        </button>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/20 px-1 py-2">
      <p className="font-mono-nums text-lg font-black leading-tight">{value}</p>
      <p className="text-[10px] font-semibold leading-tight opacity-95">{label}</p>
    </div>
  );
}

function Celebration({ pet, today }: { pet: Pet; today: string }) {
  const next = nextCelebration(pet.born_on, today);
  const isToday = next.daysLeft === 0;
  return (
    <div
      className={`mx-5 flex items-center gap-3 rounded-2xl border p-4 ${isToday ? "love-day text-white" : ""}`}
      style={
        isToday
          ? { backgroundImage: "var(--color-gradient)", borderColor: "transparent" }
          : { background: "var(--color-surface)", borderColor: "var(--color-line)" }
      }
    >
      <span className={`text-3xl ${isToday ? "capsule-wiggle" : ""}`}>{next.birthday ? "🎂" : "🎉"}</span>
      <div className="min-w-0 flex-1">
        {isToday ? (
          <>
            <p className="text-base font-black">¡Hoy {pet.name} cumple {next.label}!</p>
            <p className="text-xs font-semibold opacity-95">Felicidades, bolita 🐾</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Cumple {next.label} el {dayLabel(next.day)}
            </p>
            <p className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
              {next.daysLeft === 1 ? "¡Mañana!" : `Faltan ${next.daysLeft} días`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Álbum

function Album({
  spaceId,
  pet,
  photos,
  today,
  pending,
  run,
}: {
  spaceId: string;
  pet: Pet;
  photos: PetPhoto[];
  today: string;
  pending: boolean;
  run: Run;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState(today);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<PetPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save() {
    if (!file) return;
    setUploading(true);
    setError(null);
    let blob: Blob;
    try {
      blob = await resizeImage(file, 1600);
    } catch {
      setUploading(false);
      setError("No se pudo leer esa imagen. Prueba con otra.");
      return;
    }
    const supabase = createClient();
    const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(PET_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg" });
    setUploading(false);
    if (uploadError) {
      setError("No se pudo subir la foto. Inténtalo de nuevo.");
      return;
    }
    run(
      async () => {
        const result = await addPetPhoto(pet.id, { path, caption, takenOn });
        // Que no quede una foto huérfana en el almacén si no se pudo guardar.
        if (result.error) await supabase.storage.from(PET_BUCKET).remove([path]);
        return result;
      },
      () => {
        setFile(null);
        setCaption("");
        setTakenOn(today);
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {file ? (
        <div
          className="mx-5 flex flex-col gap-2 rounded-2xl border p-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            📸 {file.name.length > 30 ? "Foto elegida" : file.name}
          </p>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={140}
            placeholder={`¿Qué estaba haciendo ${pet.name}? (opcional)`}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            style={fieldStyle}
          />
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
            Fecha
            <PickerField
              type="date"
              value={takenOn}
              min={pet.born_on}
              max={today}
              onChange={setTakenOn}
              className="rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
              placeholder="Elige el día"
              wrapperClassName="flex-1"
            />
          </label>
          {error ? (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFile(null)}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ color: "var(--color-muted)" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={uploading || pending}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundImage: "var(--color-gradient)" }}
            >
              {uploading || pending ? "Subiendo…" : "Guardar"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mx-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold"
          style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
        >
          <ImagePlus size={17} />
          Añadir una foto de {pet.name}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) setFile(picked);
        }}
      />

      {photos.length === 0 ? (
        <p className="mx-5 py-6 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Aquí iréis viendo cómo crece {pet.name} 🐾 Cada foto dice qué edad tenía.
        </p>
      ) : (
        <ul className="mx-5 grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setViewing(photo)}
                className="relative block aspect-square w-full overflow-hidden rounded-2xl"
                style={{ background: "var(--color-line)" }}
              >
                {photo.url ? (
                  <Image src={photo.url} alt={photo.caption ?? ""} fill sizes="200px" unoptimized className="object-cover" />
                ) : null}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                  {shortAge(pet.born_on, photo.taken_on)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewing ? (
        <div
          role="dialog"
          aria-label="Foto"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/95 p-4"
          onClick={() => setViewing(null)}
        >
          {viewing.url ? (
            <div className="relative h-[65vh] w-full">
              <Image src={viewing.url} alt={viewing.caption ?? ""} fill unoptimized className="object-contain" />
            </div>
          ) : null}
          <p className="text-center text-sm font-semibold text-white">
            {viewing.caption ? `${viewing.caption} · ` : ""}
            {ageLabel(pet.born_on, viewing.taken_on)} ({dayLabel(viewing.taken_on)})
          </p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("¿Borrar esta foto? No se puede deshacer.")) return;
                const id = viewing.id;
                run(() => deletePetPhoto(pet.id, id), () => setViewing(null));
              }}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm text-white"
            >
              <Trash2 size={15} /> Borrar
            </button>
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              <X size={15} /> Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------ Peso

function Weights({
  pet,
  weights,
  today,
  pending,
  run,
}: {
  pet: Pet;
  weights: PetWeight[];
  today: string;
  pending: boolean;
  run: Run;
}) {
  const [grams, setGrams] = useState("");
  const [day, setDay] = useState(today);
  const last = weights[weights.length - 1];
  const prev = weights[weights.length - 2];
  const diff = last && prev ? last.grams - prev.grams : null;

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setPetWeight(pet.id, { day, grams: Number(grams) }), () => setGrams(""));
        }}
        className="mx-5 flex flex-col gap-2 rounded-2xl border p-3"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-[2] items-center gap-1 rounded-xl border px-3" style={fieldStyle}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={grams}
              onChange={(e) => setGrams(e.target.value.replace(/\D/g, ""))}
              placeholder="850"
              aria-label="Peso en gramos"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
            <span className="text-sm" style={{ color: "var(--color-muted)" }}>
              g
            </span>
          </label>
          <PickerField
            type="date"
            value={day}
            min={pet.born_on}
            max={today}
            onChange={setDay}
            aria-label="Día"
            className="rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
            placeholder="Elige el día"
            wrapperClassName="flex-[3]"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !grams}
          className="rounded-xl px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          ⚖️ Apuntar peso
        </button>
      </form>

      {weights.length === 0 ? (
        <p className="mx-5 py-6 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Pesadlo de vez en cuando y aquí veréis cómo crece 📈
        </p>
      ) : (
        <>
          <div
            className="mx-5 rounded-2xl border p-3"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Peso de {pet.name}
            </p>
            {last ? (
              <p className="mt-1 text-2xl font-black" style={{ color: "var(--color-ink)" }}>
                {formatWeight(last.grams)}
                {diff !== null && diff !== 0 ? (
                  <span className="ml-2 text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
                    {diff > 0 ? "▲" : "▼"} {formatWeight(Math.abs(diff))} desde la anterior
                  </span>
                ) : null}
              </p>
            ) : null}
            <WeightChart weights={weights} />
          </div>
          <ul className="mx-5 flex flex-col gap-1">
            {[...weights].reverse().map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                style={{ background: "var(--color-surface)", color: "var(--color-ink)" }}
              >
                <span>
                  <span className="font-semibold">{formatWeight(w.grams)}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--color-muted)" }}>
                    {dayLabel(w.day)} · con {shortAge(pet.born_on, w.day)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Borrar este peso?")) run(() => deletePetWeight(pet.id, w.id));
                  }}
                  aria-label={`Borrar el peso del ${dayLabel(w.day)}`}
                  style={{ color: "var(--color-muted)" }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Diario

function Diary({
  pet,
  events,
  today,
  pending,
  run,
}: {
  pet: Pet;
  events: PetEvent[];
  today: string;
  pending: boolean;
  run: Run;
}) {
  const [kind, setKind] = useState<PetEventKind>("primera_vez");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today);

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addPetEvent(pet.id, { day, kind, title }), () => setTitle(""));
        }}
        className="mx-5 flex flex-col gap-2 rounded-2xl border p-3"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <div className="flex flex-wrap gap-1.5">
          {PET_EVENT_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className="rounded-full border px-2.5 py-1 text-xs font-semibold"
              style={{
                background: kind === k.id ? "var(--color-accent)" : "var(--color-bg)",
                borderColor: kind === k.id ? "var(--color-accent)" : "var(--color-line)",
                color: kind === k.id ? "#ffffff" : "var(--color-ink)",
              }}
            >
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
        <input
          required
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "primera_vez" ? "Primera vez que se sube al sofá" : "Primera vacuna trivalente"}
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={fieldStyle}
        />
        <div className="flex gap-2">
          <PickerField
            type="date"
            value={day}
            min={pet.born_on}
            onChange={setDay}
            aria-label="Día"
            className="rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
            placeholder="Elige el día"
            wrapperClassName="flex-1"
          />
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            Apuntar
          </button>
        </div>
      </form>

      {events.length === 0 ? (
        <p className="mx-5 py-6 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Vacunas, visitas al veterinario, la primera vez que hizo algo… Todo lo de {pet.name}, aquí 🐾
        </p>
      ) : (
        <ol className="mx-5 flex flex-col gap-2">
          {events.map((ev) => {
            const k = findKind(ev.kind);
            return (
              <li
                key={ev.id}
                className="flex items-start gap-3 rounded-2xl border p-3"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                >
                  {k.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    {ev.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {k.label} · {dayLabel(ev.day)}
                    {ev.day >= pet.born_on ? ` · con ${shortAge(pet.born_on, ev.day)}` : ""}
                    {ev.day > today ? " · próximamente" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Borrar «${ev.title}»?`)) run(() => deletePetEvent(pet.id, ev.id));
                  }}
                  aria-label={`Borrar «${ev.title}»`}
                  style={{ color: "var(--color-muted)" }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
