-- Banco inicial de preguntas para "Pregunta del día" (Fase 9).
-- Es contenido compartido, no dato personal, pero igualmente se
-- ejecuta a mano una sola vez en el SQL Editor (ver supabase/README.md),
-- nunca se genera automáticamente desde la app.

insert into public.questions (text, category) values
  ('¿Cuál fue tu primera impresión de mí?', 'recuerdos'),
  ('Si pudiéramos teletransportarnos a cualquier sitio ahora mismo, ¿a dónde iríamos?', 'ligera'),
  ('¿Qué comida podrías comer todos los días sin cansarte?', 'ligera'),
  ('¿Cuál ha sido el momento más gracioso que hemos vivido juntos?', 'recuerdos'),
  ('Si tuvieras un superpoder solo por un día, ¿cuál elegirías?', 'ligera'),
  ('¿Qué es lo que más admiras de mí?', 'profunda'),
  ('¿Cuál es tu recuerdo favorito de nuestras vacaciones?', 'recuerdos'),
  ('Si ganáramos la lotería mañana, ¿qué sería lo primero que harías?', 'futuro'),
  ('¿Qué canción te recuerda a nosotros?', 'recuerdos'),
  ('¿Cuál crees que es nuestra mejor cualidad como pareja?', 'profunda'),
  ('¿Qué animal te representa mejor y por qué?', 'ligera'),
  ('Si pudiéramos cenar con cualquier persona (viva o no), ¿con quién sería?', 'ligera'),
  ('¿Cuál es tu sueño más loco para el futuro?', 'futuro'),
  ('¿Qué película podrías ver mil veces sin aburrirte?', 'ligera'),
  ('¿Cuál fue el momento en que supiste que esto iba en serio?', 'profunda'),
  ('Si tuviéramos un día libre sin planes, ¿qué harías?', 'futuro'),
  ('¿Qué manía mía te hace gracia (en el buen sentido)?', 'ligera'),
  ('¿Cuál es tu lugar favorito del mundo?', 'ligera'),
  ('Si pudieras aprender cualquier habilidad al instante, ¿cuál sería?', 'ligera'),
  ('¿Qué es lo que más te gusta de nuestra rutina juntos?', 'profunda'),
  ('¿Cuál ha sido tu logro del que más orgulloso/a estás?', 'profunda'),
  ('Si fuéramos personajes de una serie, ¿cuál seríamos?', 'ligera'),
  ('¿Qué es algo que quieres que hagamos juntos este año?', 'futuro'),
  ('¿Cuál es tu forma favorita de relajarte después de un día largo?', 'ligera');
