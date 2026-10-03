-- Reto de las uñas 💅: días sin morderse las uñas.
--
-- Cada persona puede tener su reto (desde un día) y apuntar los días en que
-- se las mordió y cuántas veces. Los dos ven el reto del otro (para
-- animarse), pero cada uno solo toca el suyo.

create table public.nail_challenges (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_on date not null check (started_on >= date '2020-01-01'),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

alter table public.nail_challenges enable row level security;

create policy "nail_challenges_select_member"
on public.nail_challenges for select to authenticated
using (public.is_space_member(space_id));

-- El tuyo, y que no empiece en el futuro (hora de Madrid).
create policy "nail_challenges_insert_own"
on public.nail_challenges for insert to authenticated
with check (
  public.is_space_member(space_id)
  and user_id = auth.uid()
  and started_on <= (now() at time zone 'Europe/Madrid')::date
);

create policy "nail_challenges_update_own"
on public.nail_challenges for update to authenticated
using (public.is_space_member(space_id) and user_id = auth.uid())
with check (
  public.is_space_member(space_id)
  and user_id = auth.uid()
  and started_on <= (now() at time zone 'Europe/Madrid')::date
);

-- Un día con mordiscos: cuántas veces (1 a 50) y una nota opcional.
create table public.nail_bites (
  space_id uuid not null,
  user_id uuid not null,
  day date not null,
  count integer not null check (count between 1 and 50),
  note text check (note is null or char_length(note) between 1 and 140),
  updated_at timestamptz not null default now(),
  primary key (space_id, user_id, day),
  foreign key (space_id, user_id) references public.nail_challenges (space_id, user_id) on delete cascade
);

alter table public.nail_bites enable row level security;

create policy "nail_bites_select_member"
on public.nail_bites for select to authenticated
using (public.is_space_member(space_id));

-- Solo en tu reto, desde que empezó y no en el futuro.
create policy "nail_bites_insert_own"
on public.nail_bites for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_space_member(space_id)
  and day <= (now() at time zone 'Europe/Madrid')::date
  and exists (
    select 1 from public.nail_challenges c
    where c.space_id = nail_bites.space_id and c.user_id = nail_bites.user_id and c.started_on <= nail_bites.day
  )
);

create policy "nail_bites_update_own"
on public.nail_bites for update to authenticated
using (user_id = auth.uid() and public.is_space_member(space_id))
with check (
  user_id = auth.uid()
  and public.is_space_member(space_id)
  and day <= (now() at time zone 'Europe/Madrid')::date
  and exists (
    select 1 from public.nail_challenges c
    where c.space_id = nail_bites.space_id and c.user_id = nail_bites.user_id and c.started_on <= nail_bites.day
  )
);

create policy "nail_bites_delete_own"
on public.nail_bites for delete to authenticated
using (user_id = auth.uid() and public.is_space_member(space_id));
