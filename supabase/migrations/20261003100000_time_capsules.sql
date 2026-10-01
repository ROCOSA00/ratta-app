-- Cápsula del tiempo 💌
--
-- Uno escribe una carta (con foto si quiere) que queda BLOQUEADA hasta un
-- día. La pareja ve que existe, quién la escribió y cuándo se abre (y una
-- pista opcional), pero no lo que dice hasta ese día. Quien la escribe sí
-- puede releerla.
--
-- El bloqueo lo hace la base de datos, no la app: el contenido está en otra
-- tabla (capsule_contents) cuya RLS solo deja leerlo a quien lo escribió o
-- a partir del día de apertura. La foto, igual (almacén privado "capsules").
--
-- El día de apertura, a partir de las 9:00 de Madrid, capsule_tick() avisa
-- a quien la recibe. Se llama desde event_reminders_tick(), que pg_cron ya
-- ejecuta cada hora: no hay que programar nada nuevo.

-- =========================================================
-- 1. Las cápsulas (lo que se ve siempre)
-- =========================================================
create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  open_on date not null,
  hint text check (hint is null or char_length(hint) between 1 and 80),
  created_at timestamptz not null default now(),
  -- Cuándo la abrió quien la recibe por primera vez (null = aún no).
  opened_at timestamptz,
  -- Cuándo se avisó de que hoy se abre (null = aún no).
  notified_at timestamptz,
  unique (id, space_id)
);

create index capsules_space_idx on public.capsules (space_id, open_on);

alter table public.capsules enable row level security;

create policy "capsules_select_member"
on public.capsules for select to authenticated
using (public.is_space_member(space_id));

-- Solo a tu nombre, en tu espacio, y para abrirse de mañana en adelante
-- (como mucho dentro de 10 años).
create policy "capsules_insert_own"
on public.capsules for insert to authenticated
with check (
  public.is_space_member(space_id)
  and created_by = auth.uid()
  and opened_at is null
  and notified_at is null
  and open_on > (now() at time zone 'Europe/Madrid')::date
  and open_on <= (now() at time zone 'Europe/Madrid')::date + interval '10 years'
);

-- Puedes borrar las que escribiste tú (con su contenido, en cascada).
create policy "capsules_delete_own"
on public.capsules for delete to authenticated
using (public.is_space_member(space_id) and created_by = auth.uid());

-- =========================================================
-- 2. El contenido (bloqueado hasta el día)
-- =========================================================
create table public.capsule_contents (
  capsule_id uuid primary key,
  space_id uuid not null,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 5000),
  photo_path text unique,
  foreign key (capsule_id, space_id) references public.capsules (id, space_id) on delete cascade,
  check (photo_path is null or photo_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

alter table public.capsule_contents enable row level security;

create policy "capsule_contents_select"
on public.capsule_contents for select to authenticated
using (
  exists (
    select 1 from public.capsules c
    where c.id = capsule_id
      and public.is_space_member(c.space_id)
      and (c.created_by = auth.uid() or c.open_on <= (now() at time zone 'Europe/Madrid')::date)
  )
);

create policy "capsule_contents_insert_own"
on public.capsule_contents for insert to authenticated
with check (
  exists (
    select 1 from public.capsules c
    where c.id = capsule_id
      and c.space_id = capsule_contents.space_id
      and c.created_by = auth.uid()
      and public.is_space_member(c.space_id)
  )
);

-- Crear la cápsula y su contenido de una vez (si algo falla, no queda
-- nada a medias). Con los permisos de quien llama: la RLS se aplica igual.
create or replace function public.create_capsule(
  p_space_id uuid,
  p_open_on date,
  p_hint text,
  p_title text,
  p_body text,
  p_photo_path text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.capsules (space_id, created_by, open_on, hint)
  values (p_space_id, auth.uid(), p_open_on, p_hint)
  returning id into v_id;

  insert into public.capsule_contents (capsule_id, space_id, title, body, photo_path)
  values (v_id, p_space_id, p_title, p_body, p_photo_path);

  return v_id;
end;
$$;

-- Quien la recibe la abre por primera vez: se apunta la hora. Devuelve
-- true solo esa primera vez (para avisar a quien la escribió).
create or replace function public.open_capsule(p_capsule_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  update public.capsules
  set opened_at = now()
  where id = p_capsule_id
    and opened_at is null
    and created_by <> auth.uid()
    and public.is_space_member(space_id)
    and open_on <= (now() at time zone 'Europe/Madrid')::date
  returning true into v_found;
  return coalesce(v_found, false);
end;
$$;

revoke execute on function public.create_capsule(uuid, date, text, text, text, text) from public, anon;
revoke execute on function public.open_capsule(uuid) from public, anon;
grant execute on function public.create_capsule(uuid, date, text, text, text, text) to authenticated;
grant execute on function public.open_capsule(uuid) to authenticated;

-- =========================================================
-- 3. Almacén privado "capsules"
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capsules', 'capsules', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ver la foto: la tuya siempre; la de tu pareja, solo si puedes ver su
-- contenido (la regla de arriba). Así no se salta el bloqueo pidiendo el
-- fichero directamente.
create policy "capsules_objects_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'capsules'
  and public.is_space_member_folder((storage.foldername(name))[1])
  and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.capsule_contents cc where cc.photo_path = storage.objects.name)
  )
);

create policy "capsules_objects_insert_member"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'capsules'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "capsules_objects_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'capsules'
  and owner_id = auth.uid()::text
  and public.is_space_member_folder((storage.foldername(name))[1])
);

-- =========================================================
-- 4. Aviso del día de apertura
-- =========================================================
create or replace function public.capsule_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamp := now() at time zone 'Europe/Madrid';
  v_due record;
  v_targets jsonb;
  v_author text;
  v_secret text;
begin
  if extract(hour from v_now) < 9 then
    return;
  end if;

  -- Las de hoy (o de hace un par de días, por si el reloj estuvo parado).
  for v_due in
    update public.capsules
    set notified_at = now()
    where notified_at is null
      and open_on <= v_now::date
      and open_on > v_now::date - 3
    returning space_id, created_by
  loop
    -- Solo a quien la recibe, no a quien la escribió.
    select coalesce(
             jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)),
             '[]'::jsonb
           )
      into v_targets
    from public.push_subscriptions ps
    join public.space_members m on m.user_id = ps.user_id
    where m.space_id = v_due.space_id
      and ps.user_id <> v_due.created_by;

    select coalesce(nullif(display_name, ''), 'Tu pareja') into v_author
    from public.profiles where id = v_due.created_by;

    if v_secret is null then
      select decrypted_secret into v_secret
      from vault.decrypted_secrets
      where name = 'moment_cron_secret';
    end if;

    if v_secret is not null and jsonb_array_length(v_targets) > 0 then
      perform net.http_post(
        url := 'https://ratta-app.vercel.app/api/capsulas',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_secret
        ),
        body := jsonb_build_object('targets', v_targets, 'author', left(coalesce(v_author, 'Tu pareja'), 60)),
        timeout_milliseconds := 10000
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.capsule_tick() from public, anon, authenticated;

-- event_reminders_tick() (ya programada cada hora) llama ahora también a
-- capsule_tick(). El resto, igual que en 20261002100000_event_edit_skip.sql.
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
  -- De paso, las cápsulas del tiempo que se abren hoy (ver capsule_tick()).
  -- Así no hace falta programar nada más en pg_cron.
  perform public.capsule_tick();

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
