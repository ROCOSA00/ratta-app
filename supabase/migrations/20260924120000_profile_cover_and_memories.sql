-- Perfil con foto de portada + Recuerdos (galería privada de fotos).

-- =========================================================
-- 1. Foto de portada del perfil
-- =========================================================
-- La imagen se guarda en el bucket "avatars" (ruta <uuid>/cover), que ya
-- solo deja escribir a cada persona en su propia carpeta. Aquí solo hace
-- falta dónde apuntar su URL; profiles_update_self ya limita la edición
-- a tu propio perfil.
alter table public.profiles add column if not exists cover_url text;

-- =========================================================
-- 2. Recuerdos: tabla
-- =========================================================
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  storage_path text not null unique,
  caption text check (char_length(caption) <= 200),
  taken_on date,
  created_at timestamptz not null default now(),
  -- La foto tiene que vivir en la carpeta de su propio espacio.
  check (storage_path like space_id::text || '/%')
);

create index memories_space_id_idx on public.memories (space_id, created_at desc);

alter table public.memories enable row level security;

-- Los dos veis todos los recuerdos del espacio...
create policy "memories_select_member"
on public.memories for select to authenticated
using (public.is_space_member(space_id));

create policy "memories_insert_member"
on public.memories for insert to authenticated
with check (public.is_space_member(space_id) and uploaded_by = auth.uid());

-- ...pero cada uno solo edita o borra los que ha subido él/ella.
create policy "memories_update_own"
on public.memories for update to authenticated
using (public.is_space_member(space_id) and uploaded_by = auth.uid())
with check (public.is_space_member(space_id) and uploaded_by = auth.uid());

create policy "memories_delete_own"
on public.memories for delete to authenticated
using (public.is_space_member(space_id) and uploaded_by = auth.uid());

-- =========================================================
-- 3. Recuerdos: almacén de fotos PRIVADO
-- =========================================================
-- A diferencia de "avatars", este bucket no es público: las fotos solo
-- se ven con un enlace firmado y temporal que genera la app para
-- vosotros dos. Ruta: <space_id>/<uuid>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  false,
  5242880, -- 5 MB (la app reduce las fotos antes de subirlas)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Comparación como texto (no ::uuid) para que una ruta con una carpeta
-- que no sea un uuid simplemente no coincida, en vez de dar un error.
-- SECURITY DEFINER por el mismo motivo que is_space_member().
create or replace function public.is_space_member_folder(folder text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.space_members
    where space_id::text = folder
      and user_id = auth.uid()
  );
$$;

create policy "memories_objects_select_member"
on storage.objects for select to authenticated
using (
  bucket_id = 'memories'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "memories_objects_insert_member"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'memories'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "memories_objects_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'memories'
  and owner_id = auth.uid()::text
  and public.is_space_member_folder((storage.foldername(name))[1])
);
