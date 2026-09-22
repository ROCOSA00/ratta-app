-- Fase 4 (1/3): identidad y espacios compartidos.
-- Capa base: profiles (espejo de auth.users), spaces y space_members.
-- Todo el resto del esquema cuelga de space_id y se protege comprobando
-- pertenencia a través de is_space_member(), nunca por email/nombre.

create extension if not exists "pgcrypto";

-- Función reutilizable: actualiza updated_at en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- profiles
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Espejo público de auth.users. Se crea sola vía trigger handle_new_user al registrarse.';

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Crea automáticamente la fila de profiles cuando alguien se registra en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- =========================================================
-- spaces
-- =========================================================

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.spaces enable row level security;

-- =========================================================
-- space_members
-- =========================================================

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create index space_members_user_id_idx on public.space_members (user_id);

alter table public.space_members enable row level security;

-- =========================================================
-- Helper central de RLS: ¿pertenece el usuario actual a este espacio?
--
-- security definer + search_path fijo hace que la consulta interna se
-- ejecute como el propietario de la función (el rol que aplica las
-- migraciones), que es dueño de space_members y por tanto se salta su
-- propia RLS. Así evitamos el error clásico de "infinite recursion
-- detected in policy" que aparece si una política de space_members
-- intenta consultar space_members respetando RLS.
-- =========================================================

create or replace function public.is_space_member(check_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = check_space_id
      and user_id = auth.uid()
  );
$$;

-- =========================================================
-- Políticas RLS
-- =========================================================

-- profiles: cada uno ve su propio perfil y el de quienes comparten
-- espacio con él/ella (para poder mostrar el nombre/avatar del otro).
create policy "profiles_select_self_or_space_peer"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.space_members my
    join public.space_members peer on peer.space_id = my.space_id
    where my.user_id = auth.uid()
      and peer.user_id = profiles.id
  )
);

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- spaces: solo lectura para miembros. No hay política de INSERT/UPDATE/
-- DELETE: el Ratta Space y sus miembros se dan de alta una única vez
-- desde el editor SQL de Supabase (rol postgres, que se salta RLS), no
-- desde la app. Documentado en supabase/README.md.
create policy "spaces_select_member"
on public.spaces for select
to authenticated
using (public.is_space_member(id));

-- space_members: mismo criterio, solo lectura para miembros del espacio.
create policy "space_members_select_member"
on public.space_members for select
to authenticated
using (public.is_space_member(space_id));
