-- Juego de los corazones: cada uno pulsa para mandar corazones y hay un
-- ranking (hoy, semana, mes, total).
--
-- Se guarda una fila por persona y DÍA (hora de Madrid) con el total de
-- ese día, no una fila por toque: se puede pulsar muy rápido y la app
-- agrupa los toques en paquetes antes de enviarlos.

create table public.heart_taps (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (space_id, user_id, day)
);

alter table public.heart_taps enable row level security;

-- Los dos miembros del espacio ven los contadores de ambos (es un ranking).
create policy "heart_taps_select_member"
on public.heart_taps for select to authenticated
using (public.is_space_member(space_id));

-- No hay políticas de INSERT/UPDATE/DELETE: nadie escribe directamente en
-- la tabla. La única forma de sumar es add_hearts(), que siempre suma a
-- quien tiene la sesión, en un espacio del que es miembro, y como mucho
-- 300 corazones por llamada.

-- Devuelve true si toca avisar a la pareja: solo al empezar una racha
-- (si llevabas 10 minutos o más sin mandar corazones), no en cada paquete.
create or replace function public.add_hearts(p_space_id uuid, p_count integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Madrid')::date;
  v_last timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_space_member(p_space_id) then
    raise exception 'not a member of this space';
  end if;
  if p_count is null or p_count < 1 or p_count > 300 then
    raise exception 'invalid heart count';
  end if;

  select max(updated_at) into v_last
  from public.heart_taps
  where space_id = p_space_id and user_id = v_user;

  insert into public.heart_taps (space_id, user_id, day, count, updated_at)
  values (p_space_id, v_user, v_day, p_count, now())
  on conflict (space_id, user_id, day)
  do update set count = public.heart_taps.count + excluded.count, updated_at = now();

  return v_last is null or v_last < now() - interval '10 minutes';
end;
$$;

revoke all on function public.add_hearts(uuid, integer) from public, anon;
grant execute on function public.add_hearts(uuid, integer) to authenticated;
