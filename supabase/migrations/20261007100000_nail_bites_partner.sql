-- Reto de las uñas: tu pareja también puede apuntar tus mordiscos.
--
-- Hasta ahora cada uno solo tocaba sus propios días. Ahora cualquiera de
-- los dos puede apuntar (o corregir) los mordiscos del reto del otro, y se
-- guarda quién lo apuntó (reported_by). Empezar o cambiar el reto sigue
-- siendo solo cosa de cada uno.

alter table public.nail_bites
  add column reported_by uuid references public.profiles (id) on delete set null;

drop policy "nail_bites_insert_own" on public.nail_bites;
drop policy "nail_bites_update_own" on public.nail_bites;
drop policy "nail_bites_delete_own" on public.nail_bites;

-- En un reto de tu espacio (el tuyo o el de tu pareja), desde que empezó,
-- no en el futuro, y apuntado a tu nombre.
create policy "nail_bites_insert_member"
on public.nail_bites for insert to authenticated
with check (
  public.is_space_member(space_id)
  and reported_by = auth.uid()
  and day <= (now() at time zone 'Europe/Madrid')::date
  and exists (
    select 1 from public.nail_challenges c
    where c.space_id = nail_bites.space_id and c.user_id = nail_bites.user_id and c.started_on <= nail_bites.day
  )
);

create policy "nail_bites_update_member"
on public.nail_bites for update to authenticated
using (public.is_space_member(space_id))
with check (
  public.is_space_member(space_id)
  and reported_by = auth.uid()
  and day <= (now() at time zone 'Europe/Madrid')::date
  and exists (
    select 1 from public.nail_challenges c
    where c.space_id = nail_bites.space_id and c.user_id = nail_bites.user_id and c.started_on <= nail_bites.day
  )
);

create policy "nail_bites_delete_member"
on public.nail_bites for delete to authenticated
using (public.is_space_member(space_id));
