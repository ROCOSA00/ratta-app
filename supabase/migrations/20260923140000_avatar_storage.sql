-- Fase 11: almacenamiento para fotos de perfil (avatar).
-- Reutiliza profiles.avatar_url, que ya existe desde la Fase 4.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true, -- público para lectura: son fotos de perfil, no datos sensibles
  3145728, -- 3 MB, aplicado por Supabase (no solo por el navegador)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects ya tiene RLS activada por defecto en cualquier
-- proyecto Supabase. Cada persona solo puede escribir dentro de su
-- propia carpeta (avatars/<su-uuid>/...), nunca en la de su pareja.
-- storage.foldername() la provee Supabase; devuelve los segmentos de
-- carpeta del nombre del objeto (todo antes del último "/").

create policy "avatar_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar_upload_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
