-- Lista de deseos ✨: sitios a los que ir, planes, pelis y series, comida…
--
-- Cualquiera de los dos añade deseos, los tacha cuando se cumplen (o los
-- destacha) y los borra. Todo dentro de vuestro espacio.

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'otro'
    check (category in ('lugar', 'plan', 'peli', 'comida', 'otro')),
  note text check (note is null or char_length(note) between 1 and 500),
  done_at timestamptz,
  done_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Cumplido = con fecha y con quién lo tachó; pendiente = sin ninguna.
  check ((done_at is null) = (done_by is null))
);

create index wishes_space_idx on public.wishes (space_id, created_at desc);

alter table public.wishes enable row level security;

create policy "wishes_select_member"
on public.wishes for select to authenticated
using (public.is_space_member(space_id));

-- Nace pendiente y a tu nombre.
create policy "wishes_insert_member"
on public.wishes for insert to authenticated
with check (
  public.is_space_member(space_id)
  and created_by = auth.uid()
  and done_at is null
);

-- Tachar o destachar: si lo tachas, a tu nombre.
create policy "wishes_update_member"
on public.wishes for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id) and (done_by is null or done_by = auth.uid()));

create policy "wishes_delete_member"
on public.wishes for delete to authenticated
using (public.is_space_member(space_id));

-- Solo se pueden cambiar estas columnas (no el autor ni el espacio).
revoke update on public.wishes from authenticated, anon;
grant update (title, category, note, done_at, done_by) on public.wishes to authenticated;
