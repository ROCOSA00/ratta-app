-- Chat: responder a un mensaje y reacciones con emoji.
--
-- 1. messages.reply_to: el mensaje al que se responde (de vuestro mismo
--    espacio). Si se borra el original, la respuesta se queda sin cita.
-- 2. message_reactions: una reacción por persona y mensaje. Quitarla es
--    dejar emoji = null (así en tiempo real solo hay inserciones y cambios,
--    que se pueden filtrar por espacio; los borrados no).

-- =========================================================
-- 1. Responder
-- =========================================================
alter table public.messages
  add column reply_to uuid references public.messages (id) on delete set null;

drop policy "messages_insert_member" on public.messages;
create policy "messages_insert_member"
on public.messages for insert to authenticated
with check (
  public.is_space_member(space_id)
  and sender_id = auth.uid()
  and (
    reply_to is null
    or exists (
      select 1 from public.messages r
      where r.id = messages.reply_to and r.space_id = messages.space_id
    )
  )
);

-- =========================================================
-- 2. Reacciones
-- =========================================================
create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  emoji text check (emoji is null or emoji in ('❤️', '😂', '😮', '😢', '🔥', '👍', '🐀')),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index message_reactions_space_idx on public.message_reactions (space_id);

alter table public.message_reactions enable row level security;

create policy "message_reactions_select_member"
on public.message_reactions for select to authenticated
using (public.is_space_member(space_id));

-- Solo la tuya, y solo en mensajes de tu espacio.
create policy "message_reactions_insert_own"
on public.message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_space_member(space_id)
  and exists (
    select 1 from public.messages m
    where m.id = message_reactions.message_id and m.space_id = message_reactions.space_id
  )
);

create policy "message_reactions_update_own"
on public.message_reactions for update to authenticated
using (user_id = auth.uid() and public.is_space_member(space_id))
with check (
  user_id = auth.uid()
  and public.is_space_member(space_id)
  and exists (
    select 1 from public.messages m
    where m.id = message_reactions.message_id and m.space_id = message_reactions.space_id
  )
);

-- Poner, cambiar o quitar (null) tu reacción a un mensaje. Con los
-- permisos de quien llama: la RLS de arriba se aplica igual.
create or replace function public.react_to_message(p_message_id uuid, p_emoji text)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.message_reactions (message_id, user_id, space_id, emoji, updated_at)
  select m.id, auth.uid(), m.space_id, p_emoji, now()
  from public.messages m
  where m.id = p_message_id
  on conflict (message_id, user_id) do update set emoji = excluded.emoji, updated_at = now();
$$;

revoke execute on function public.react_to_message(uuid, text) from public, anon;
grant execute on function public.react_to_message(uuid, text) to authenticated;

-- En tiempo real, como los mensajes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;
