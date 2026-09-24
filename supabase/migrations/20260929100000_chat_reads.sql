-- Mensajes sin leer del chat.
--
-- Para cada persona se guarda hasta cuándo ha leído el chat de su espacio.
-- Los mensajes de su pareja posteriores a ese momento son los "sin leer"
-- (el globo rojo del Chat en la barra de abajo).

create table public.chat_reads (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

alter table public.chat_reads enable row level security;

-- Cada uno solo ve y toca su propia marca de lectura.
create policy "chat_reads_select_own"
on public.chat_reads for select to authenticated
using (user_id = auth.uid());

create policy "chat_reads_insert_own"
on public.chat_reads for insert to authenticated
with check (user_id = auth.uid() and public.is_space_member(space_id));

create policy "chat_reads_update_own"
on public.chat_reads for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and public.is_space_member(space_id));

-- Marcar el chat como leído ahora (con el reloj de la base de datos, el
-- mismo que pone la hora a los mensajes). Se ejecuta con los permisos de
-- quien la llama, así que la RLS de arriba se aplica igual.
create or replace function public.mark_chat_read(p_space_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.chat_reads (space_id, user_id, last_read_at)
  values (p_space_id, auth.uid(), now())
  on conflict (space_id, user_id) do update set last_read_at = now();
$$;

-- Cuántos mensajes de tu pareja hay sin leer. Sin marca (nunca abriste el
-- chat desde que existe esto), 0. También con los permisos de quien llama:
-- la RLS de messages solo deja contar los de tu espacio.
create or replace function public.unread_chat_count(p_space_id uuid)
returns integer
language sql
security invoker
set search_path = public
stable
as $$
  select count(*)::integer
  from public.messages m
  where m.space_id = p_space_id
    and m.sender_id <> auth.uid()
    and m.created_at > coalesce(
      (select r.last_read_at from public.chat_reads r
       where r.space_id = p_space_id and r.user_id = auth.uid()),
      now()
    );
$$;

revoke execute on function public.mark_chat_read(uuid) from public, anon;
revoke execute on function public.unread_chat_count(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.unread_chat_count(uuid) to authenticated;

-- Los que ya estáis dentro empezáis con todo leído.
insert into public.chat_reads (space_id, user_id, last_read_at)
select space_id, user_id, now() from public.space_members
on conflict (space_id, user_id) do nothing;
