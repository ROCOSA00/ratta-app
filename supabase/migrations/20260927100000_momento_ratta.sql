-- Momento Ratta (vuestro BeReal).
--
-- Cada día suena a una hora al azar entre las 10:00 y las 22:00 (hora de
-- Madrid). Desde que suena tenéis 10 minutos para subir una foto de lo
-- que estáis haciendo; después se puede subir igual, pero queda marcada
-- como "tarde". No ves la foto de tu pareja de un día hasta que subes la
-- tuya (o hasta que ese día termina).
--
-- El "despertador" es moment_tick(), que ejecuta pg_cron cada minuto
-- (se programa aparte, ver supabase/README.md). Cuando toca, avisa a la
-- app por HTTP (pg_net) con una clave guardada en Vault, y la app manda
-- las notificaciones.

-- =========================================================
-- 1. El momento de cada día
-- =========================================================
create table public.moment_days (
  space_id uuid not null references public.spaces (id) on delete cascade,
  day date not null,
  -- Hora elegida al azar para ese día.
  fires_at timestamptz not null,
  -- Cuándo sonó de verdad (null = aún no). Los 10 minutos cuentan desde aquí.
  notified_at timestamptz,
  primary key (space_id, day)
);

alter table public.moment_days enable row level security;

-- Solo se ve un día cuando ya ha sonado: si no, se podría mirar la hora
-- de hoy por adelantado. Nadie escribe aquí salvo moment_tick().
create policy "moment_days_select_member"
on public.moment_days for select to authenticated
using (public.is_space_member(space_id) and notified_at is not null);

-- =========================================================
-- 2. Las fotos
-- =========================================================
create table public.moment_photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  day date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) <= 140),
  -- Segundos de retraso respecto a los 10 minutos (0 = a tiempo). Lo
  -- calcula la base de datos al subirla, no la app: no se puede falsear.
  late_seconds integer not null default 0 check (late_seconds >= 0),
  created_at timestamptz not null default now(),
  unique (space_id, day, user_id),
  foreign key (space_id, day) references public.moment_days (space_id, day) on delete cascade,
  check (storage_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

alter table public.moment_photos enable row level security;

-- ¿Puedes ver las fotos de ese día? Si ya subiste la tuya, o si el día
-- ya terminó. SECURITY DEFINER para poder mirar si subiste la tuya sin
-- que la política se llame a sí misma.
create or replace function public.can_see_moment(p_space_id uuid, p_day date)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_space_member(p_space_id)
    and (
      p_day < (now() at time zone 'Europe/Madrid')::date
      or exists (
        select 1 from public.moment_photos
        where space_id = p_space_id and day = p_day and user_id = auth.uid()
      )
    );
$$;

-- Quién ha subido ya su foto un día (sin enseñar la foto): para poder
-- decir "Giselz ya ha subido la suya, sube la tuya para verla".
create or replace function public.moment_posters(p_space_id uuid, p_day date)
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id from public.moment_photos
  where space_id = p_space_id and day = p_day and public.is_space_member(p_space_id);
$$;

create policy "moment_photos_select"
on public.moment_photos for select to authenticated
using (
  (user_id = auth.uid() and public.is_space_member(space_id))
  or public.can_see_moment(space_id, day)
);

create policy "moment_photos_insert_own"
on public.moment_photos for insert to authenticated
with check (public.is_space_member(space_id) and user_id = auth.uid());

-- Puedes borrar la tuya (para repetirla); al volver a subirla, el retraso
-- se recalcula con la hora nueva.
create policy "moment_photos_delete_own"
on public.moment_photos for delete to authenticated
using (public.is_space_member(space_id) and user_id = auth.uid());

-- Al subir: solo el momento de HOY, solo si ya ha sonado, y el retraso lo
-- calcula la base de datos con su propio reloj.
create or replace function public.moment_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_notified timestamptz;
begin
  if new.day <> v_today then
    raise exception 'solo se puede subir el momento de hoy';
  end if;

  select notified_at into v_notified
  from public.moment_days
  where space_id = new.space_id and day = new.day;

  if v_notified is null then
    raise exception 'el momento de hoy aun no ha sonado';
  end if;

  new.created_at := now();
  new.late_seconds := greatest(0, floor(extract(epoch from (now() - v_notified)))::integer - 600);
  return new;
end;
$$;

create trigger moment_photos_before_insert
before insert on public.moment_photos
for each row execute function public.moment_photos_before_insert();

-- =========================================================
-- 3. Almacén privado "moments"
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ver un fichero: el tuyo siempre; el de tu pareja, solo si puedes ver su
-- fila en moment_photos (la regla de arriba: ya subiste la tuya o el día
-- terminó). Así no se puede saltar la regla pidiendo el fichero directo.
create policy "moments_objects_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'moments'
  and public.is_space_member_folder((storage.foldername(name))[1])
  and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.moment_photos p where p.storage_path = storage.objects.name)
  )
);

create policy "moments_objects_insert_member"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'moments'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "moments_objects_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'moments'
  and owner_id = auth.uid()::text
  and public.is_space_member_folder((storage.foldername(name))[1])
);

-- =========================================================
-- 4. El despertador
-- =========================================================
-- Lo ejecuta pg_cron cada minuto. Nadie más puede llamarlo.
create or replace function public.moment_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_due record;
  v_targets jsonb;
  v_secret text;
begin
  -- 1. La hora de hoy para cada espacio, al azar entre las 10:00 y las
  --    22:00 de Madrid (solo la primera vez que se ejecuta cada día).
  insert into public.moment_days (space_id, day, fires_at)
  select s.id, v_today,
         ((v_today + time '10:00') at time zone 'Europe/Madrid') + random() * interval '12 hours'
  from public.spaces s
  on conflict (space_id, day) do nothing;

  -- 2. Los que ya toca hacer sonar. Si el despertador estuvo parado más de
  --    2 horas, ese día se salta (mejor eso que sonar a medianoche).
  for v_due in
    update public.moment_days
    set notified_at = now()
    where day = v_today
      and notified_at is null
      and fires_at <= now()
      and fires_at > now() - interval '2 hours'
    returning space_id
  loop
    select coalesce(
             jsonb_agg(jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)),
             '[]'::jsonb
           )
      into v_targets
    from public.push_subscriptions ps
    join public.space_members m on m.user_id = ps.user_id
    where m.space_id = v_due.space_id;

    if v_secret is null then
      select decrypted_secret into v_secret
      from vault.decrypted_secrets
      where name = 'moment_cron_secret';
    end if;

    -- Sin clave o sin móviles suscritos no se avisa, pero el momento cuenta
    -- igual: en Inicio aparecerá el aviso al abrir la app.
    if v_secret is not null and jsonb_array_length(v_targets) > 0 then
      perform net.http_post(
        url := 'https://ratta-app.vercel.app/api/momento',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_secret
        ),
        body := jsonb_build_object('targets', v_targets),
        timeout_milliseconds := 10000
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.moment_tick() from public, anon, authenticated;
revoke all on function public.moment_photos_before_insert() from public, anon, authenticated;
revoke execute on function public.can_see_moment(uuid, date) from public, anon;
revoke execute on function public.moment_posters(uuid, date) from public, anon;
grant execute on function public.can_see_moment(uuid, date) to authenticated;
grant execute on function public.moment_posters(uuid, date) to authenticated;
