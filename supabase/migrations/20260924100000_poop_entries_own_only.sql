-- El Trono: cada persona solo puede editar o borrar SUS propios registros.
--
-- Antes, las políticas de UPDATE/DELETE de poop_entries solo exigían ser
-- miembro del espacio, así que cualquiera de los dos podía borrar (o
-- cambiar de dueño) los registros del otro llamando directamente a la API
-- de Supabase, aunque la app nunca lo hiciera. Leer sigue siendo
-- compartido (las estadísticas comparan a los dos) y crear ya estaba
-- limitado a user_id = auth.uid().

alter policy "poop_entries_update_member"
on public.poop_entries
using (public.is_space_member(space_id) and user_id = auth.uid())
with check (public.is_space_member(space_id) and user_id = auth.uid());

alter policy "poop_entries_delete_member"
on public.poop_entries
using (public.is_space_member(space_id) and user_id = auth.uid());
