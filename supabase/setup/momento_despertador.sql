-- Puesta en marcha del despertador del Momento Ratta.
--
-- NO es una migración: se ejecuta una sola vez, a mano, en el SQL Editor
-- de Supabase, siguiendo los pasos de supabase/README.md ("Momento
-- Ratta"). Requiere tener activadas las extensiones pg_cron y pg_net
-- (Database → Extensions) y aplicada 20260927100000_momento_ratta.sql.

-- ---------------------------------------------------------------------
-- PASO 1. Crear la clave secreta del despertador, guardada en Vault.
-- Es aleatoria (64 caracteres) y nadie la escribe a mano.
-- ---------------------------------------------------------------------
select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'moment_cron_secret',
  'Clave del despertador del Momento Ratta (debe coincidir con MOMENT_CRON_SECRET en Vercel)'
);

-- ---------------------------------------------------------------------
-- PASO 2. Ver la clave para copiarla en Vercel (MOMENT_CRON_SECRET).
-- ---------------------------------------------------------------------
select decrypted_secret from vault.decrypted_secrets where name = 'moment_cron_secret';

-- ---------------------------------------------------------------------
-- PASO 3 (cuando la app nueva ya esté publicada en Vercel). Programar el
-- despertador: cada minuto mira si ya es la hora del Momento de hoy.
-- ---------------------------------------------------------------------
-- select cron.schedule('momento-ratta', '* * * * *', $$ select public.moment_tick(); $$);

-- ---------------------------------------------------------------------
-- Utilidades (opcionales)
-- ---------------------------------------------------------------------
-- Ver si el despertador se está ejecutando bien:
--   select status, return_message, start_time from cron.job_run_details
--   order by start_time desc limit 5;
-- Ver las últimas llamadas a la app (código 200 = avisos enviados):
--   select status_code, content, created from net._http_response
--   order by created desc limit 5;
-- Pararlo:
--   select cron.unschedule('momento-ratta');
