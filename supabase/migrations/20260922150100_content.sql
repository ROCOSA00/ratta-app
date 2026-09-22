-- Fase 4 (2/3): contenido del espacio compartido.
-- events (calendario), notes + note_items + note_versions, poop_entries.
-- Todas cuelgan de space_id (directo o vía join) y usan is_space_member().

-- =========================================================
-- events
-- =========================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create index events_space_id_idx on public.events (space_id);

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_member"
on public.events for select to authenticated
using (public.is_space_member(space_id));

create policy "events_insert_member"
on public.events for insert to authenticated
with check (public.is_space_member(space_id) and created_by = auth.uid());

create policy "events_update_member"
on public.events for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "events_delete_member"
on public.events for delete to authenticated
using (public.is_space_member(space_id));

-- =========================================================
-- notes
-- =========================================================

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null,
  note_type text not null default 'text' check (note_type in ('text', 'checklist')),
  content text not null default '',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_space_id_idx on public.notes (space_id);

create trigger set_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

alter table public.notes enable row level security;

create policy "notes_select_member"
on public.notes for select to authenticated
using (public.is_space_member(space_id));

create policy "notes_insert_member"
on public.notes for insert to authenticated
with check (public.is_space_member(space_id) and created_by = auth.uid());

create policy "notes_update_member"
on public.notes for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "notes_delete_member"
on public.notes for delete to authenticated
using (public.is_space_member(space_id));

-- =========================================================
-- note_items (checklist dentro de una nota tipo "checklist")
-- =========================================================

create table public.note_items (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  content text not null,
  is_checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index note_items_note_id_idx on public.note_items (note_id);

create trigger set_note_items_updated_at
before update on public.note_items
for each row execute function public.set_updated_at();

alter table public.note_items enable row level security;

-- No hay space_id directo: se comprueba pertenencia a través de la nota.
create policy "note_items_select_member"
on public.note_items for select to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_items.note_id
      and public.is_space_member(n.space_id)
  )
);

create policy "note_items_insert_member"
on public.note_items for insert to authenticated
with check (
  exists (
    select 1 from public.notes n
    where n.id = note_items.note_id
      and public.is_space_member(n.space_id)
  )
);

create policy "note_items_update_member"
on public.note_items for update to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_items.note_id
      and public.is_space_member(n.space_id)
  )
)
with check (
  exists (
    select 1 from public.notes n
    where n.id = note_items.note_id
      and public.is_space_member(n.space_id)
  )
);

create policy "note_items_delete_member"
on public.note_items for delete to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_items.note_id
      and public.is_space_member(n.space_id)
  )
);

-- =========================================================
-- note_versions (historial inmutable de una nota)
-- =========================================================

create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  content text not null,
  edited_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index note_versions_note_id_idx on public.note_versions (note_id);

alter table public.note_versions enable row level security;

create policy "note_versions_select_member"
on public.note_versions for select to authenticated
using (
  exists (
    select 1 from public.notes n
    where n.id = note_versions.note_id
      and public.is_space_member(n.space_id)
  )
);

-- Solo INSERT: es un histórico, nunca se edita ni se borra una versión pasada.
create policy "note_versions_insert_member"
on public.note_versions for insert to authenticated
with check (
  edited_by = auth.uid()
  and exists (
    select 1 from public.notes n
    where n.id = note_versions.note_id
      and public.is_space_member(n.space_id)
  )
);

-- =========================================================
-- poop_entries (El Trono)
-- =========================================================

create table public.poop_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  logged_at timestamptz not null default now(),
  bristol_scale smallint check (bristol_scale between 1 and 7),
  notes text,
  created_at timestamptz not null default now()
);

create index poop_entries_space_id_idx on public.poop_entries (space_id);

alter table public.poop_entries enable row level security;

create policy "poop_entries_select_member"
on public.poop_entries for select to authenticated
using (public.is_space_member(space_id));

create policy "poop_entries_insert_member"
on public.poop_entries for insert to authenticated
with check (public.is_space_member(space_id) and user_id = auth.uid());

create policy "poop_entries_update_member"
on public.poop_entries for update to authenticated
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

create policy "poop_entries_delete_member"
on public.poop_entries for delete to authenticated
using (public.is_space_member(space_id));
