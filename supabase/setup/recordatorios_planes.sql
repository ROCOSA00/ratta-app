-- Puesta en marcha del aviso del día antes de los planes.
--
-- NO es una migración: se ejecuta una sola vez, a mano, en el SQL Editor
-- de Supabase, DESPUÉS de aplicar 20261001100000_event_recurrence_reminders.sql
-- y de que la app nueva esté publicada en Vercel (si no, la llamada de
-- esta noche llegaría a una app que aún no tiene /api/recordatorios).
--
-- Usa la misma clave de Vault que el Momento Ratta (moment_cron_secret):
-- no hay que crear ni copiar ninguna clave nueva.

-- Cada hora, en el minuto 5. La función solo hace algo a partir de las
-- 20:00 de Madrid, y solo una vez por noche.
select cron.schedule('recordatorios-planes', '5 * * * *', $$ select public.event_reminders_tick(); $$);

-- ---------------------------------------------------------------------
-- Utilidades (opcionales)
-- ---------------------------------------------------------------------
-- Ver qué noches ya se avisó:
--   select day, sent_at from public.event_reminder_runs order by day desc limit 5;
-- Ver las últimas llamadas a la app (código 200 = avisos enviados):
--   select status_code, content, created from net._http_response
--   order by created desc limit 5;
-- Pararlo:
--   select cron.unschedule('recordatorios-planes');
