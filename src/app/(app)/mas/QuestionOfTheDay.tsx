import { HelpCircle, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { AnswerForm } from "./AnswerForm";

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-6 text-center"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      {children}
    </div>
  );
}

export async function QuestionOfTheDay() {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) {
    return (
      <Card>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No perteneces a ningún espacio todavía.
        </p>
      </Card>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayDateString();

  // ¿Ya hay ronda para hoy? Si no, se crea con una pregunta que este
  // espacio no haya usado todavía (o cualquiera, si ya se usaron todas).
  let round = await getRoundForToday(supabase, spaceId, today);
  if (!round) {
    round = await createRoundForToday(supabase, spaceId, today);
  }

  if (!round) {
    return (
      <Card>
        <HelpCircle size={24} style={{ color: "var(--color-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Todavía no hay preguntas cargadas. Añádelas en{" "}
          <code className="text-xs">supabase/seed.sql</code>.
        </p>
      </Card>
    );
  }

  const [{ data: members }, { data: answers }] = await Promise.all([
    supabase.from("space_members").select("user_id").eq("space_id", spaceId),
    supabase
      .from("question_answers")
      .select("user_id, answer")
      .eq("round_id", round.id),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const answerList = (answers ?? []) as { user_id: string; answer: string }[];
  const answerByUser = new Map(answerList.map((a) => [a.user_id, a.answer]));

  const hasAnswered = answerByUser.has(user.id);
  const allAnswered = memberIds.length > 0 && memberIds.every((id) => answerByUser.has(id));

  let displayNameById = new Map<string, string>();
  if (allAnswered) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", memberIds);
    displayNameById = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));
  }

  return (
    <div
      className="mx-5 rounded-2xl border p-5"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>
        Pregunta del día
      </p>
      <p className="mt-1.5 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
        {round.question.text}
      </p>

      {!hasAnswered ? (
        <AnswerForm roundId={round.id} />
      ) : allAnswered ? (
        <div className="mt-4 flex flex-col gap-3">
          {memberIds.map((id) => (
            <div key={id} className="rounded-xl p-3" style={{ background: "var(--color-bg)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
                {id === user.id ? "Tú" : (displayNameById.get(id) ?? "Compañero/a")}
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--color-ink)" }}>
                {answerByUser.get(id)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-xl p-3" style={{ background: "var(--color-bg)" }}>
          <Clock3 size={16} style={{ color: "var(--color-muted)" }} />
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Ya has respondido. Esperando a que tu pareja también conteste
            para revelar las respuestas.
          </p>
        </div>
      )}
    </div>
  );
}

type Round = { id: string; question: { text: string } };

async function getRoundForToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  today: string,
): Promise<Round | null> {
  const { data } = await supabase
    .from("question_rounds")
    .select("id, questions(text)")
    .eq("space_id", spaceId)
    .eq("round_date", today)
    .maybeSingle();

  if (!data) return null;
  const question = data.questions as unknown as { text: string } | null;
  if (!question) return null;
  return { id: data.id as string, question };
}

async function createRoundForToday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  today: string,
): Promise<Round | null> {
  const { data: activeQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("is_active", true);

  if (!activeQuestions || activeQuestions.length === 0) return null;

  const { data: usedRounds } = await supabase
    .from("question_rounds")
    .select("question_id")
    .eq("space_id", spaceId);

  const usedIds = new Set((usedRounds ?? []).map((r) => r.question_id as string));
  const unused = activeQuestions.filter((q) => !usedIds.has(q.id as string));
  const pool = unused.length > 0 ? unused : activeQuestions;
  const chosen = pool[Math.floor(Math.random() * pool.length)] as { id: string };

  const { error: insertError } = await supabase.from("question_rounds").insert({
    space_id: spaceId,
    question_id: chosen.id,
    round_date: today,
  });

  // Si falla (p. ej. carrera con la otra persona creando la misma
  // ronda a la vez), simplemente volvemos a leerla: ya existirá.
  if (insertError) {
    return getRoundForToday(supabase, spaceId, today);
  }

  return getRoundForToday(supabase, spaceId, today);
}
