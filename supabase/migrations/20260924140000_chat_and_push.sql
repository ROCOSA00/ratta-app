-- Chat en tiempo real + notificaciones push.

-- =========================================================
-- 1. Chat
-- =========================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_space_created_idx on public.messages (space_id, created_at desc);

alter table public.messages enable row level security;

create policy "messages_select_member"
on public.messages for select to authenticated
using (public.is_space_member(space_id));

create policy "messages_insert_member"
on public.messages for insert to authenticated
with check (public.is_space_member(space_id) and sender_id = auth.uid());

-- Cada uno puede borrar solo sus propios mensajes. No hay UPDATE: un
-- mensaje enviado no se edita.
create policy "messages_delete_own"
on public.messages for delete to authenticated
using (public.is_space_member(space_id) and sender_id = auth.uid());

-- Tiempo real: Supabase Realtime solo emite cambios de las tablas que
-- estén en esta publicación, y los filtra con la RLS de SELECT de cada
-- persona suscrita (nadie de fuera recibe vuestros mensajes).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- =========================================================
-- 2. Suscripciones a notificaciones push (una por dispositivo)
-- =========================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Directamente, cada uno solo ve y borra las suyas.
create policy "push_subscriptions_select_own"
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

-- Guardar: si el mismo móvil ya estaba suscrito (p. ej. con la otra
-- cuenta), la suscripción pasa a quien tiene la sesión abierta ahora.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'invalid subscription';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end;
$$;

-- Para avisar a tu pareja: sus suscripciones, y solo las de quien
-- comparte espacio contigo (nunca las tuyas ni las de nadie más).
create or replace function public.partner_push_subscriptions()
returns table (endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
stable
as $$
  select ps.endpoint, ps.p256dh, ps.auth
  from public.push_subscriptions ps
  where ps.user_id <> auth.uid()
    and exists (
      select 1
      from public.space_members me
      join public.space_members peer on peer.space_id = me.space_id
      where me.user_id = auth.uid()
        and peer.user_id = ps.user_id
    );
$$;

-- Si el servicio de push dice que una suscripción de tu pareja ya no
-- existe (móvil cambiado, permiso retirado), se limpia.
create or replace function public.forget_partner_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions ps
  where ps.endpoint = p_endpoint
    and exists (
      select 1
      from public.space_members me
      join public.space_members peer on peer.space_id = me.space_id
      where me.user_id = auth.uid()
        and peer.user_id = ps.user_id
    );
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.partner_push_subscriptions() from public, anon;
revoke execute on function public.forget_partner_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.partner_push_subscriptions() to authenticated;
grant execute on function public.forget_partner_push_subscription(text) to authenticated;
