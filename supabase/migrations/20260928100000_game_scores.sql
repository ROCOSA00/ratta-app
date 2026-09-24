-- Puntuaciones de los minijuegos (de momento, Flappy Rata).
--
-- Una fila por persona, juego y DÍA (hora de Madrid) con la mejor
-- puntuación de ese día y cuántas partidas se jugaron. Así la tabla no
-- crece con cada partida y el ranking sale barato.

create table public.game_days (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('flappy')),
  day date not null,
  best integer not null check (best >= 0),
  plays integer not null check (plays >= 1),
  updated_at timestamptz not null default now(),
  primary key (space_id, user_id, game, day)
);

alter table public.game_days enable row level security;

-- Los dos ven las puntuaciones de ambos (es un ranking). Nadie escribe
-- directamente: solo con record_game_score().
create policy "game_days_select_member"
on public.game_days for select to authenticated
using (public.is_space_member(space_id));

-- Guarda una partida de quien tiene la sesión y devuelve los récords
-- ANTERIORES (el tuyo y el de tu pareja), para que la app sepa si has
-- batido el tuyo o le has quitado el récord a tu pareja.
create or replace function public.record_game_score(p_space_id uuid, p_game text, p_score integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Madrid')::date;
  v_my_best integer;
  v_partner_best integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of this space';
  end if;
  if p_game is null or p_game not in ('flappy') then
    raise exception 'unknown game';
  end if;
  if p_score is null or p_score < 0 or p_score > 10000 then
    raise exception 'invalid score';
  end if;

  select coalesce(max(best), 0) into v_my_best
  from public.game_days
  where space_id = p_space_id and game = p_game and user_id = v_user;

  select coalesce(max(best), 0) into v_partner_best
  from public.game_days
  where space_id = p_space_id and game = p_game and user_id <> v_user;

  insert into public.game_days (space_id, user_id, game, day, best, plays, updated_at)
  values (p_space_id, v_user, p_game, v_day, p_score, 1, now())
  on conflict (space_id, user_id, game, day)
  do update set
    best = greatest(public.game_days.best, excluded.best),
    plays = public.game_days.plays + 1,
    updated_at = now();

  return jsonb_build_object('my_prev_best', v_my_best, 'partner_best', v_partner_best);
end;
$$;

revoke all on function public.record_game_score(uuid, text, integer) from public, anon;
grant execute on function public.record_game_score(uuid, text, integer) to authenticated;
