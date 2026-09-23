-- Fotos en el chat.
--
-- Cada mensaje puede llevar una foto (image_path) además de, o en vez de,
-- texto. Las fotos van a un almacén PRIVADO "chat", igual que Recuerdos:
-- solo se ven con enlaces firmados y temporales que genera la app.
-- Ruta: <space_id>/<uuid>.jpg

-- =========================================================
-- 1. Columna de la foto en messages
-- =========================================================
alter table public.messages add column image_path text;

-- La foto tiene que estar en la carpeta del MISMO espacio que el mensaje:
-- así nadie puede "enlazar" en su mensaje una foto de otro espacio.
alter table public.messages
  add constraint messages_image_path_check
  check (image_path is null or image_path ~ ('^' || space_id::text || '/[0-9a-f-]{36}\.jpg$'));

-- Antes el texto era obligatorio (1-2000 caracteres). Ahora puede ir vacío
-- si el mensaje lleva foto; sin foto sigue haciendo falta texto.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages
  add constraint messages_body_check
  check (char_length(body) <= 2000 and (char_length(body) >= 1 or image_path is not null));

-- Las políticas RLS de messages no cambian: siguen exigiendo ser miembro
-- del espacio (y ser tú el remitente al enviar).

-- =========================================================
-- 2. Almacén privado "chat"
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat',
  'chat',
  false,
  5242880, -- 5 MB (la app reduce las fotos antes de subirlas)
  array['image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Mismo esquema que "memories": se usa is_space_member_folder(), creada en
-- 20260924120000_profile_cover_and_memories.sql.
create policy "chat_objects_select_member"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "chat_objects_insert_member"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat'
  and public.is_space_member_folder((storage.foldername(name))[1])
);

create policy "chat_objects_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat'
  and owner_id = auth.uid()::text
  and public.is_space_member_folder((storage.foldername(name))[1])
);
