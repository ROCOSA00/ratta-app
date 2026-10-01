-- Editar planes y saltarse una vez de un plan que se repite.
--
-- 1. events.skipped_days: los días sueltos en que un plan que se repite NO
--    toca ("este sábado no hay yoga"). La app los quita del calendario y el
--    aviso del día antes tampoco salta esos días.
-- 2. Al editar un plan suelto y cambiarlo de día, sus fotos se mueven con
--    él: se puede cambiar `occurrence` de una foto (y SOLO esa columna), y
--    solo a un día en que el plan de verdad toca.

-- =========================================================
-- 1. Veces saltadas
-- =========================================================
alter table public.events
  add column skipped_days date[] not null default '{}'
    check (cardinality(skipped_days) <= 500);

-- El aviso del día antes no salta los días saltados (el resto, igual que
-- en 20261001100000_event_recurrence_reminders.sql).
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
      and not (v_tomorrow = any (e.skipped_days))
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

-- =========================================================
-- 2. Mover las fotos al editar un plan
-- =========================================================
revoke update on public.event_photos from authenticated, anon;
grant update (occurrence) on public.event_photos to authenticated;

create policy "event_photos_update_member"
on public.event_photos for update to authenticated
using (public.is_space_member(space_id))
with check (
  public.is_space_member(space_id)
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.space_id = event_photos.space_id
      and public.event_occurs_on(e.start_at, e.recurrence, e.recurrence_until, event_photos.occurrence)
  )
);
