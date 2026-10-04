import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { Pet } from "@/lib/pets/get-pet";
import { ageLabel, nextCelebration } from "@/lib/pets/age";
import { todayKey } from "@/lib/calendar/date-utils";

/** En Inicio: la mascota, su edad y su próxima celebración (o la de hoy). */
export function PetHomeCard({ pet }: { pet: Pet | undefined }) {
  if (!pet) return null;
  const today = todayKey();
  const next = nextCelebration(pet.born_on, today);
  const isToday = next.daysLeft === 0;

  return (
    <Link
      href="/mascota"
      data-tour="pet"
      className={`relative mx-5 flex items-center gap-3 overflow-hidden rounded-2xl p-4 ${isToday ? "love-day text-white" : "border"}`}
      style={
        isToday
          ? { backgroundImage: "var(--color-gradient)" }
          : {
              background: "color-mix(in srgb, #fb923c 9%, var(--color-surface))",
              borderColor: "color-mix(in srgb, #fb923c 28%, var(--color-line))",
            }
      }
    >
      {isToday ? <span aria-hidden className="love-day-hearts" /> : null}
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow">
        {pet.photoUrl ? (
          <Image src={pet.photoUrl} alt={pet.name} fill sizes="56px" unoptimized className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-orange-100 text-3xl">{pet.emoji}</span>
        )}
      </span>
      <div className="relative min-w-0 flex-1">
        {isToday ? (
          <>
            <p className="text-sm font-black">
              {next.birthday ? "🎂" : "🎉"} ¡Hoy {pet.name} cumple {next.label}!
            </p>
            <p className="text-xs font-semibold opacity-95">Felicidades, bolita 🐾</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              {pet.name} {pet.emoji} · {ageLabel(pet.born_on, today)}
            </p>
            <p className="text-xs font-medium" style={{ color: "#ea580c" }}>
              {next.birthday ? "🎂" : "🎉"} Cumple {next.label} {next.daysLeft === 1 ? "mañana" : `en ${next.daysLeft} días`}
            </p>
          </>
        )}
      </div>
      <ChevronRight size={16} className="relative" style={{ color: isToday ? "#ffffff" : "var(--color-muted)" }} />
    </Link>
  );
}
