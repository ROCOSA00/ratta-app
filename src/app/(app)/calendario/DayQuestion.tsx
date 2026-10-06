import type { DayQuestion as DayQuestionData } from "@/lib/day/get-day";

/** La pregunta de ese día y lo que respondisteis (lo de tu pareja, si respondiste tú). */
export function DayQuestion({ question, isToday }: { question: DayQuestionData; isToday: boolean }) {
  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))",
        borderColor: "color-mix(in srgb, var(--color-accent) 18%, var(--color-line))",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>
        ❓ Pregunta del día
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
        {question.text}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {question.answers.map((a) => (
          <li key={a.userId} className="rounded-xl px-3 py-2" style={{ background: "var(--color-surface)" }}>
            <p className="text-[11px] font-bold" style={{ color: "var(--color-muted)" }}>
              {a.name}
            </p>
            <p className="whitespace-pre-wrap text-sm" style={{ color: a.answer ? "var(--color-ink)" : "var(--color-muted)" }}>
              {a.answer ??
                (a.mine
                  ? isToday
                    ? "Aún no has respondido: hazlo en Inicio 💬"
                    : "No respondiste ese día 🙈"
                  : question.iAnswered
                    ? isToday
                      ? "Aún no ha respondido ⏳"
                      : "No respondió ese día"
                    : "🔒 Su respuesta solo se ve si respondes tú")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
