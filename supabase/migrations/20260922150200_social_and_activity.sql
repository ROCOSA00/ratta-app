-- Fase 4 (3/3): pregunta del día y feed de actividad.
-- questions (banco global de contenido) + question_rounds + question_answers,
-- y activity_log como registro de auditoría inmutable del espacio.

-- =========================================================
-- questions: banco global de preguntas, no depende de un espacio.
-- =========================================================

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

-- Contenido compartido de solo lectura para cualquier usuario autenticado.
-- El banco de preguntas se gestiona manualmente (no es dato personal).
create policy "questions_select_authenticated"
on public.questions for select to authenticated
using (true);

-- =========================================================
-- question_rounds: qué pregunta le toca a un espacio en una fecha.
-- =========================================================

create table public.question_rounds (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  round_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (space_id, round_date)
);

create index question_rounds_space_id_idx on public.question_rounds (space_id);

alter table public.question_rounds enable row level security;

create policy "question_rounds_select_member"
on public.question_rounds for select to authenticated
using (public.is_space_member(space_id));

create policy "question_rounds_insert_member"
on public.question_rounds for insert to authenticated
with check (public.is_space_member(space_id));

-- =========================================================
-- question_answers: respuesta de cada miembro a una ronda.
-- =========================================================

create table public.question_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.question_rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  answer text not null,
  answered_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create index question_answers_round_id_idx on public.question_answers (round_id);

alter table public.question_answers enable row level security;

create policy "question_answers_select_member"
on public.question_answers for select to authenticated
using (
  exists (
    select 1 from public.question_rounds qr
    where qr.id = question_answers.round_id
      and public.is_space_member(qr.space_id)
  )
);

create policy "question_answers_insert_own"
on public.question_answers for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.question_rounds qr
    where qr.id = question_answers.round_id
      and public.is_space_member(qr.space_id)
  )
);

-- Solo se puede editar la propia respuesta, no la de tu pareja.
-- Sin política de DELETE a propósito: una respuesta ya enviada no se borra.
create policy "question_answers_update_own"
on public.question_answers for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================================================
-- activity_log: feed de actividad del espacio, de solo inserción.
-- =========================================================

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_space_id_idx on public.activity_log (space_id, created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_log_select_member"
on public.activity_log for select to authenticated
using (public.is_space_member(space_id));

-- Sin UPDATE/DELETE: es un registro de auditoría, no debe poder manipularse.
create policy "activity_log_insert_member"
on public.activity_log for insert to authenticated
with check (public.is_space_member(space_id) and user_id = auth.uid());
