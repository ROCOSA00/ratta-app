-- Fase 10: permite fijar una nota para que aparezca en el dashboard
-- de Inicio. Las políticas RLS de UPDATE en notes ya cubren esta
-- columna (cualquier miembro del espacio puede editar cualquier nota
-- del espacio), no hace falta ninguna política nueva.

alter table public.notes
  add column is_pinned boolean not null default false;
