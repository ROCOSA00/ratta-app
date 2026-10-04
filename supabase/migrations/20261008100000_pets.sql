-- Mascotas 🐱 (empezando por Kofi, nacido el 15 de agosto de 2026).
--
-- Cada mascota tiene su ficha (nombre, nacimiento, llegada a casa, foto),
-- un registro de peso, un diario (vacunas, veterinario, primeras veces…) y
-- un álbum de fotos. Todo lo ven y lo tocan los dos, dentro de su espacio.
-- Las fotos van al almacén PRIVADO "pets": <space_id>/<uuid>.jpg.

-- =========================================================
-- 1. Fichas
-- =========================================================
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text not null default '🐱' check (char_length(emoji) between 1 and 8),
  born_on date not null,
  adopted_on date,
  photo_path text,
  created_at timestamptz not null default now(),
  unique (id, space_id),
  check (adopted_on is null or adopted_on >= born_on),
  check (photo_path is null or photo_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

alter table public.pets enable row level security;

create policy "pets_select_member" on public.pets for select to authenticated
using (public.is_space_member(space_id));
create policy "pets_insert_member" on public.pets for insert to authenticated
with check (public.is_space_member(space_id));
create policy "pets_update_member" on public.pets for update to authenticated
using (public.is_space_member(space_id)) with check (public.is_space_member(space_id));

-- =========================================================
-- 2. Peso (uno por día)
-- =========================================================
create table public.pet_weights (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  space_id uuid not null,
  day date not null,
  grams integer not null check (grams between 1 and 30000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pet_id, day),
  foreign key (pet_id, space_id) references public.pets (id, space_id) on delete cascade
);

alter table public.pet_weights enable row level security;

create policy "pet_weights_select_member" on public.pet_weights for select to authenticated
using (public.is_space_member(space_id));
create policy "pet_weights_insert_member" on public.pet_weights for insert to authenticated
with check (
  public.is_space_member(space_id) and created_by = auth.uid()
  and day <= (now() at time zone 'Europe/Madrid')::date
);
create policy "pet_weights_update_member" on public.pet_weights for update to authenticated
using (public.is_space_member(space_id))
with check (
  public.is_space_member(space_id) and created_by = auth.uid()
  and day <= (now() at time zone 'Europe/Madrid')::date
);
create policy "pet_weights_delete_member" on public.pet_weights for delete to authenticated
using (public.is_space_member(space_id));

-- =========================================================
-- 3. Diario (vacunas, veterinario, primeras veces…)
-- =========================================================
create table public.pet_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  space_id uuid not null,
  day date not null,
  kind text not null check (kind in ('vacuna', 'desparasitacion', 'veterinario', 'primera_vez', 'nota')),
  title text not null check (char_length(title) between 1 and 120),
  note text check (note is null or char_length(note) between 1 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (pet_id, space_id) references public.pets (id, space_id) on delete cascade
);

create index pet_events_pet_idx on public.pet_events (pet_id, day desc);

alter table public.pet_events enable row level security;

create policy "pet_events_select_member" on public.pet_events for select to authenticated
using (public.is_space_member(space_id));
create policy "pet_events_insert_member" on public.pet_events for insert to authenticated
with check (public.is_space_member(space_id) and created_by = auth.uid());
create policy "pet_events_delete_member" on public.pet_events for delete to authenticated
using (public.is_space_member(space_id));

-- =========================================================
-- 4. Álbum
-- =========================================================
create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  space_id uuid not null,
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) between 1 and 140),
  taken_on date not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (pet_id, space_id) references public.pets (id, space_id) on delete cascade,
  check (storage_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

create index pet_photos_pet_idx on public.pet_photos (pet_id, taken_on desc);

alter table public.pet_photos enable row level security;

create policy "pet_photos_select_member" on public.pet_photos for select to authenticated
using (public.is_space_member(space_id));
create policy "pet_photos_insert_member" on public.pet_photos for insert to authenticated
with check (public.is_space_member(space_id) and uploaded_by = auth.uid());
create policy "pet_photos_delete_member" on public.pet_photos for delete to authenticated
using (public.is_space_member(space_id));

-- Almacén privado "pets" (mismo esquema que "event-photos").
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pets', 'pets', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "pets_objects_select_member" on storage.objects for select to authenticated
using (bucket_id = 'pets' and public.is_space_member_folder((storage.foldername(name))[1]));
create policy "pets_objects_insert_member" on storage.objects for insert to authenticated
with check (bucket_id = 'pets' and public.is_space_member_folder((storage.foldername(name))[1]));
create policy "pets_objects_delete_member" on storage.objects for delete to authenticated
using (bucket_id = 'pets' and public.is_space_member_folder((storage.foldername(name))[1]));

-- =========================================================
-- 5. Kofi 🐱 y su cumpleaños en el calendario
-- =========================================================
insert into public.pets (space_id, name, emoji, born_on)
select s.id, 'Kofi', '🐱', date '2026-08-15'
from public.spaces s
where not exists (select 1 from public.pets p where p.space_id = s.id and p.name = 'Kofi');

-- Cada 15 de agosto, todo el día, con aviso la noche antes.
insert into public.events (
  space_id, created_by, title, description, start_at, end_at, all_day, recurrence, remind_day_before
)
select s.id,
       s.created_by,
       '🎂 Cumpleaños de Kofi',
       'Nuestra bolita cumple años 🐱',
       timestamp '2027-08-15 00:00' at time zone 'Europe/Madrid',
       timestamp '2027-08-15 23:59' at time zone 'Europe/Madrid',
       true,
       'yearly',
       true
from public.spaces s
where not exists (
  select 1 from public.events e where e.space_id = s.id and e.title = '🎂 Cumpleaños de Kofi'
);
