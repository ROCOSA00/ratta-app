-- Fotos de un día del calendario, sin plan: «porque sí».
--
-- Van al mismo almacén privado que las fotos de los planes
-- ("event-photos", carpeta <space_id>/), que ya tiene sus reglas.
-- Los dos ven y quitan las de su espacio; subirlas, a tu nombre, de hoy
-- o de días pasados.

create table public.day_photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  day date not null,
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) between 1 and 140),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (storage_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

create index day_photos_space_day_idx on public.day_photos (space_id, day);

alter table public.day_photos enable row level security;

create policy "day_photos_select_member"
on public.day_photos for select to authenticated
using (public.is_space_member(space_id));

create policy "day_photos_insert_member"
on public.day_photos for insert to authenticated
with check (
  public.is_space_member(space_id)
  and uploaded_by = auth.uid()
  and day <= (now() at time zone 'Europe/Madrid')::date
);

create policy "day_photos_delete_member"
on public.day_photos for delete to authenticated
using (public.is_space_member(space_id));
