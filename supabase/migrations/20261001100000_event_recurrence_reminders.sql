-- Planes que se repiten, aviso el día antes y el "Día con el amor de mi vida".
--
-- 1. Un plan puede repetirse (cada semana, cada 2 semanas, cada mes o cada
--    año), para siempre o hasta un día. Se guarda UNA fila (la primera vez)
--    y la app calcula las demás.
-- 2. Cada foto de un plan es de una vez concreta (occurrence): en un "cada
--    sábado", las fotos de un sábado no se mezclan con las del siguiente.
-- 3. Aviso el día antes: event_reminders_tick(), que ejecuta pg_cron cada
--    hora (se programa aparte, ver supabase/README.md), a partir de las
--    20:00 de Madrid avisa UNA vez de los planes de mañana que lo tengan
--    activado. Usa la misma clave de Vault que el Momento Ratta.
-- 4. El plan de cada día 6: "DÍA CON EL AMOR DE MI VIDA", todo el día.

-- =========================================================
-- 1. Repetición y aviso
-- =========================================================
alter table public.events
  add column recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'biweekly', 'monthly', 'yearly')),
  add column recurrence_until date,
  add column remind_day_before boolean not null default false;

alter table public.events
  add constraint events_recurrence_until_check
  check (
    recurrence_until is null
    or (recurrence <> 'none' and recurrence_until >= (start_at at time zone 'Europe/Madrid')::date)
  );

-- ¿Toca este plan el día p_day (hora de Madrid)? La misma regla que
-- occursOn() en src/lib/events/recurrence.ts.
create or replace function public.event_occurs_on(
  p_start timestamptz,
  p_recurrence text,
  p_until date,
  p_day date
)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when p_day < d then false
    when p_recurrence = 'none' then p_day = d
    when p_until is not null and p_day > p_until then false
    when p_recurrence = 'weekly' then (p_day - d) % 7 = 0
    when p_recurrence = 'biweekly' then (p_day - d) % 14 = 0
    when p_recurrence = 'monthly' then extract(day from p_day) = extract(day from d)
    when p_recurrence = 'yearly' then to_char(p_day, 'MM-DD') = to_char(d, 'MM-DD')
    else false
  end
  from (select (p_start at time zone 'Europe/Madrid')::date as d) s;
$$;

-- =========================================================
-- 2. Fotos por cada vez del plan
-- =========================================================
alter table public.event_photos add column occurrence date;

-- Las fotos que ya había son de planes sueltos: su día es el del plan.
update public.event_photos p
set occurrence = (e.start_at at time zone 'Europe/Madrid')::date
from public.events e
where e.id = p.event_id;

alter table public.event_photos alter column occurrence set not null;

-- Ahora la foto tiene que ser de un día que de verdad toca el plan.
drop policy "event_photos_insert_member" on public.event_photos;
create policy "event_photos_insert_member"
on public.event_photos for insert to authenticated
with check (
  public.is_space_member(space_id)
  and uploaded_by = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.space_id = event_photos.space_id
      and public.event_occurs_on(e.start_at, e.recurrence, e.recurrence_until, event_photos.occurrence)
  )
);

-- =========================================================
-- 3. Aviso el día antes
-- =========================================================
-- Qué días ya se avisaron (uno por espacio y día), para no repetir aviso.
-- Nadie la lee ni la escribe salvo event_reminders_tick().
create table public.event_reminder_runs (
  space_id uuid not null references public.spaces (id) on delete cascade,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (space_id, day)
);

alter table public.event_reminder_runs enable row level security;

create or replace function public.event_reminders_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamp := now() at time zone 'Europe/Madrid';
  v_tomorrow date := v_now::date + 1;
  v_space record;
  v_events jsonb;
  v_targets jsonb;
  v_secret text;
begin
  -- Se avisa a partir de las 20:00 de Madrid. Si a esa hora falló, la
  -- siguiente ejecución (21:00, 22:00…) lo recupera.
  if extract(hour from v_now) < 20 then
    return;
  end if;

  delete from public.event_reminder_runs where day < v_tomorrow - 60;

  for v_space in
    select e.space_id,
           jsonb_agg(
             jsonb_build_object(
               'title', e.title,
               'time', case when e.all_day then null
                            else to_char(e.start_at at time zone 'Europe/Madrid', 'HH24:MI') end,
               'love', coalesce(e.color = 'love', false),
               'since', to_char((e.start_at at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD')
             )
             order by e.all_day desc, (e.start_at at time zone 'Europe/Madrid')::time
           ) as events
    from public.events e
    where e.remind_day_before
      and public.event_occurs_on(e.start_at, e.recurrence, e.recurrence_until, v_tomorrow)
    group by e.space_id
  loop
    -- Una sola vez por espacio y día.
    insert into public.event_reminder_runs (space_id, day)
    values (v_space.space_id, v_tomorrow)
    on conflict (space_id, day) do nothing;
    if not found then
      continue;
    end if;

    select coalesce(jsonb_agg(value), '[]'::jsonb) into v_events
    from (select value from jsonb_array_elements(v_space.events) limit 20) t;

    select coalesce(
             jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)),
             '[]'::jsonb
           )
      into v_targets
    from public.push_subscriptions ps
    join public.space_members m on m.user_id = ps.user_id
    where m.space_id = v_space.space_id;

    if v_secret is null then
      select decrypted_secret into v_secret
      from vault.decrypted_secrets
      where name = 'moment_cron_secret';
    end if;

    if v_secret is not null and jsonb_array_length(v_targets) > 0 then
      perform net.http_post(
        url := 'https://ratta-app.vercel.app/api/recordatorios',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_secret
        ),
        body := jsonb_build_object(
          'targets', v_targets,
          'day', to_char(v_tomorrow, 'YYYY-MM-DD'),
          'events', v_events
        ),
        timeout_milliseconds := 10000
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.event_reminders_tick() from public, anon, authenticated;
revoke execute on function public.event_occurs_on(timestamptz, text, date, date) from public, anon;
grant execute on function public.event_occurs_on(timestamptz, text, date, date) to authenticated;

-- =========================================================
-- 4. Cada día 6: "DÍA CON EL AMOR DE MI VIDA"
-- =========================================================
-- Todo el día, cada mes desde el 6 de marzo de 2026 (el día que empezó
-- todo) y con aviso el día antes. color = 'love' hace que la app lo pinte
-- especial. Solo se crea si aún no existe.
insert into public.events (
  space_id, created_by, title, description, start_at, end_at, all_day, color, recurrence, remind_day_before
)
select s.id,
       s.created_by,
       'DÍA CON EL AMOR DE MI VIDA',
       'Cada día 6 es nuestro día 💞',
       timestamp '2026-03-06 00:00' at time zone 'Europe/Madrid',
       timestamp '2026-03-06 23:59' at time zone 'Europe/Madrid',
       true,
       'love',
       'monthly',
       true
from public.spaces s
where not exists (
  select 1 from public.events e where e.space_id = s.id and e.color = 'love'
);
