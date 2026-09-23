-- Fase 11 (revisión de seguridad): el revelado de "Pregunta del día"
-- (solo ver la respuesta de tu pareja si ya has respondido tú) se
-- aplicaba únicamente en el componente de React, no en la base de
-- datos. Cualquier miembro del espacio podía leer la respuesta ajena
-- llamando directamente a la API REST de Supabase (con su propio
-- token, sin pasar por la app), antes de responder él mismo.
--
-- Se cierra a nivel de RLS: además de pertenecer al espacio, solo
-- puedes ver la respuesta de otro miembro para una ronda si ya tienes
-- la tuya propia registrada en esa misma ronda. Tu propia respuesta
-- siempre la ves, hayas respondido antes o no.
--
-- has_answered_round() es SECURITY DEFINER por el mismo motivo que
-- is_space_member() en la Fase 4: si la política de question_answers
-- consultara question_answers directamente (respetando su propia RLS),
-- Postgres da "infinite recursion detected in policy". La función se
-- salta esa RLS al ejecutarse como el propietario de la tabla.

create or replace function public.has_answered_round(check_round_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.question_answers
    where round_id = check_round_id
      and user_id = auth.uid()
  );
$$;

alter policy "question_answers_select_member"
on public.question_answers
using (
  exists (
    select 1 from public.question_rounds qr
    where qr.id = question_answers.round_id
      and public.is_space_member(qr.space_id)
  )
  and (
    user_id = auth.uid()
    or public.has_answered_round(question_answers.round_id)
  )
);
