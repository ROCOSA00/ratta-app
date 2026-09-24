-- Estado de ánimo en el perfil ("Enamorado/a", "Enfadado/a", "Cagón/a"…),
-- con una nota corta opcional. Lo ve tu pareja en el chat y en tu carnet.
--
-- Las políticas de profiles no cambian: ya solo dejan editar tu propia fila
-- (y ver la tuya y la de tu pareja). La lista de estados válidos la
-- comprueba el servidor; aquí solo se limita el formato por si acaso.

alter table public.profiles
  add column status_key text
    check (status_key is null or status_key ~ '^[a-z_]{1,30}$'),
  add column status_note text
    check (status_note is null or char_length(status_note) <= 60),
  add column status_updated_at timestamptz;
