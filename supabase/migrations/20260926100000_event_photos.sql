-- Fotos de los planes del calendario.
--
-- Cada plan (events) puede tener varias fotos, que van a un almacén
-- PRIVADO "event-photos" (solo se ven con enlaces firmados y temporales).
-- Ruta: <space_id>/<uuid>.jpg

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  -- La foto tiene que estar en la carpeta del MISMO espacio que la fila.
  check (storage_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

create index event_photos_event_idx on public.event_photos (event_id, created_at);

alter table public.event_photos enable row level security;

create policy "event_photos_select_member"
on public.event_photos for select to authenticated
using (public.is_space_member(space_id));

-- Solo en tu espacio, a tu nombre, y en un plan de ESE mismo espacio (así
-- nadie puede colgar fotos en un plan ajeno cambiando el event_id).
create policy "event_photos_insert_member"
on public.event_photos for insert to authenticated
with check (
  public.is_space_member(space_id)
  and uploaded_by = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id and e.space_id = event_photos.space_id
  )
);

-- Cualquiera de los dos puede quitar fotos de un plan: igual que cualquiera
-- de los dos puede borrar el plan entero (y con él, todas sus fotos).
create policy "event_photos_delete_member"
on public.event_photos for delete to authenticated
using (public.is_space_member(space_id));

-- Almacén privado "event-photos"
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  false,
  5242880, -- 5 MB (la app reduce las fotos antes de subirlas)
  array['image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Mismo esquema que "memories" y "chat" (is_space_member_folder() se creó
-- en 20260924120000_profile_cover_and_memories.sql). Borrar: cualquier
-- miembro, para que al borrar un plan se puedan limpiar todas sus fotos.
create policy "event_photos_objects_select_member"
on storage.objects for select to authenticated
using (
  bucket_id = 'event-photos'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "event_photos_objects_insert_member"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-photos'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "event_photos_objects_delete_member"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-photos'
  and public.is_space_member_folder((storage.foldername(name))[1])
);
