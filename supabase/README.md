# Supabase — migraciones

Esquema versionado en `supabase/migrations/`. Nunca se toca el esquema
a mano desde el panel de Supabase: cualquier cambio se hace como una
nueva migración, para poder reconstruir la base de datos desde el
repositorio.

## Aplicar las migraciones al proyecto real

Con el [CLI de Supabase](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref evmyyhjtycxdybdbmyjp
npx supabase db push
```

`link` pedirá la contraseña de la base de datos (Project Settings >
Database > Connection string, no la anon key). Alternativa sin CLI:
pegar el contenido de cada fichero, en orden, en el **SQL Editor** del
panel de Supabase.

## Flappy Rata (puntuaciones de juegos) — ⏳ pendiente de aplicar

`20260928100000_game_scores.sql`. Hay que aplicarla en producción
**antes** de publicar el código que la usa.

- Tabla `game_days`: una fila por persona, juego y **día** (Madrid) con
  la mejor puntuación y el número de partidas. Los dos ven las de ambos.
- Nadie escribe directamente: solo `record_game_score()` (`SECURITY
  DEFINER`, revocada para `anon`), que guarda a nombre de quien tiene la
  sesión, en su espacio, para un juego conocido y con una puntuación
  entre 0 y 10000. Devuelve los récords anteriores (el tuyo y el de tu
  pareja) para que la app sepa si le has quitado el récord.
- Las puntuaciones las calcula el propio móvil (es un juego): alguien con
  conocimientos podría mandar una inventada, pero solo a su nombre y
  dentro de esos límites. Para un juego entre vosotros dos, suficiente.

Validada en Postgres 16 local, con todas las migraciones anteriores:

| Caso | Resultado |
|---|---|
| Primera partida | devuelve tu récord previo (0) y el de tu pareja |
| 3 partidas el mismo día (8, 20, 5) | mejor 20, 3 partidas |
| Récord de la pareja | no cuenta el de alguien de otro espacio |
| Tu pareja ve el ranking | las filas de los dos |
| Puntuación negativa o > 10000 / juego desconocido | rechazado por la función |
| Persona de fuera: jugar en vuestro espacio / ver el ranking | rechazado / 0 filas |
| Escribir, cambiar o borrar récords a mano | rechazado por RLS / 0 filas |
| Sin sesión (`anon`) | permiso denegado |

## Momento Ratta — ✅ ya aplicada y en marcha

`20260927100000_momento_ratta.sql` + la puesta en marcha de
`setup/momento_despertador.sql` (que **no** es una migración: crea una
clave propia de esta instalación y programa el despertador).
Aplicada en producción: extensiones activadas, clave creada en Vault y
copiada a `MOMENT_CRON_SECRET` en Vercel, y despertador programado
(`cron.schedule('momento-ratta', ...)`).

**Cómo funciona.** `moment_tick()` se ejecuta cada minuto con `pg_cron`.
La primera vez de cada día elige para cada espacio una hora al azar entre
las 10:00 y las 22:00 (Madrid) y la guarda en `moment_days`. Cuando llega,
marca `notified_at` y llama por HTTP (`pg_net`) a
`https://ratta-app.vercel.app/api/momento` con la clave de Vault
`moment_cron_secret`, pasándole los móviles suscritos de ese espacio; la
app (que tiene la clave VAPID) manda las notificaciones. Si el
despertador estuvo parado más de 2 horas, ese día se salta.

**Reglas (en la base de datos, no solo en la app):**
- La hora del día no se puede ver hasta que suena.
- Solo se sube el Momento de hoy, solo después de que suene, uno por
  persona y día. El retraso (`late_seconds`, más allá de los 10 min) lo
  calcula un trigger con el reloj de la base de datos: no se puede falsear.
- **Regla BeReal:** la foto de tu pareja de un día (fila y fichero) solo
  se ve si ya subiste la tuya o si ese día ya terminó.
  `moment_posters()` dice quién ha subido sin enseñar la foto.
- `moment_tick()` no la puede llamar nadie más (ni usuarios ni `anon`).
- Almacén privado `moments`; `/api/momento` solo acepta la clave correcta
  (comparación en tiempo constante) y destinos `https://`.

**Puesta en marcha (en este orden):**
1. Supabase → **Database → Extensions**: activar `pg_cron` y `pg_net`.
2. SQL Editor: ejecutar la migración `20260927100000_momento_ratta.sql`.
3. SQL Editor: ejecutar los pasos 1 y 2 de `setup/momento_despertador.sql`
   y copiar la clave que sale.
4. Vercel → Settings → Environment Variables: `MOMENT_CRON_SECRET` = esa
   clave. Luego fusionar la PR (el despliegue ya la incluye).
5. Con la app nueva publicada: ejecutar el paso 3 (`cron.schedule`).

Validada en Postgres 16 local, con todas las migraciones anteriores y
con imitaciones de Vault y `pg_net` que apuntan cada llamada:

| Caso | Resultado |
|---|---|
| Hora elegida (5000 sorteos) | siempre entre 10:00 y 22:00 de Madrid |
| Antes de la hora | no suena |
| Llega la hora | 1 llamada con los 2 móviles de la pareja y la clave |
| 4 ejecuciones más | sigue siendo 1 llamada |
| Otro espacio | su propia llamada, con sus móviles |
| Despertador parado más de 2 h | ese día se salta |
| Sin clave en Vault | cuenta como sonado, no llama |
| Usuario / `anon` llaman a `moment_tick()` | permiso denegado |
| Ver la hora antes de que suene / después | 0 / 1 filas |
| Subir antes de que suene / para otro día | rechazado por el trigger |
| A tiempo (2 min) / tarde (25 min) | retraso 0 / 900 s |
| Poner `late_seconds = 0` a mano | se recalcula igual (900) |
| Subir a nombre de tu pareja / dos el mismo día | rechazado (RLS / única) |
| Pareja sin subir la suya: ver tu foto / ver que subiste | 0 filas / sí |
| Pareja tras subir la suya | ve las 2 |
| Fichero de tu pareja antes / después de subir la tuya | 0 / visible |
| Tu propio fichero recién subido | visible |
| Día ya terminado sin subir | se ven |
| Persona de fuera: días / fotos / quién subió / subir | 0 / 0 / 0 / rechazado |
| Borrar la foto de tu pareja / la tuya | 0 / 1 |
| Escribir en `moment_days` a mano | rechazado por RLS |

## Fotos de los planes — ✅ ya aplicada

`20260926100000_event_photos.sql`. Aplicada en producción antes de
publicar el código que la usa.

- Tabla `event_photos` (varias fotos por plan). Un `CHECK` exige que la
  ruta esté en la carpeta del mismo espacio, y la política de `INSERT`
  exige que el plan (`event_id`) sea de ese mismo espacio: nadie puede
  colgar fotos en un plan ajeno. Se borran en cascada con el plan.
- Cualquiera de los dos puede quitar fotos de un plan (igual que puede
  borrar el plan entero). Almacén **privado** `event-photos` (5 MB,
  JPEG), con enlaces firmados de 1 hora.
- "Solo a partir del día del plan" lo comprueba la app (no es una regla
  de seguridad).

Validada en Postgres 16 local, con todas las migraciones anteriores:

| Caso | Resultado |
|---|---|
| Añadir foto a un plan vuestro | permitido |
| Foto en un plan de otro espacio / a nombre de tu pareja | rechazado por RLS |
| Ruta en la carpeta de otro espacio | rechazado por el `CHECK` |
| Persona de fuera: añadir (en vuestro espacio o en el suyo con vuestro plan) | rechazado por RLS |
| Ver fotos: tu pareja / persona de fuera | 1 / 0 |
| Quitar foto: tu pareja / persona de fuera | 1 / 0 borradas |
| Borrar el plan | sus fotos se borran en cascada |
| Almacén: tu pareja ve y borra / persona de fuera ve, sube o borra | sí / 0, rechazado, 0 |

## Juego de los corazones — ✅ ya aplicada

`20260925120000_hearts_game.sql`. Aplicada en producción antes de
publicar el código que la usa.

- Tabla `heart_taps`: una fila por persona y **día** (hora de Madrid)
  con el total de ese día, no una por toque. Los dos miembros del
  espacio ven las filas de ambos (es un ranking).
- **Nadie escribe directamente** en la tabla (no hay políticas de
  INSERT/UPDATE/DELETE). Solo se suma con `add_hearts(p_space_id,
  p_count)` (`SECURITY DEFINER`, revocada para `anon`), que siempre
  suma a quien tiene la sesión, exige ser miembro del espacio y acepta
  entre 1 y 300 corazones por llamada (la app agrupa los toques).
- Devuelve `true` solo si llevabas 10 minutos o más sin mandar: así la
  app avisa a tu pareja al empezar una racha, no en cada paquete.

Validada en Postgres 16 local, con todas las migraciones anteriores:

| Caso | Resultado |
|---|---|
| Primer paquete (37) | suma 37, avisar = true |
| Segundo paquete seguido (20) | suma 57, avisar = false |
| Tras 1 hora sin mandar | suma al día de hoy, avisar = true |
| Tu pareja ve el ranking | filas de los dos |
| 0, 301 o un número negativo | rechazado por la función |
| Persona de fuera: sumar / ver el ranking | rechazado / 0 filas |
| Escribir directo en la tabla | rechazado por RLS |
| Cambiar o borrar los corazones de tu pareja | 0 filas |
| Sin sesión (`anon`) llama a `add_hearts` | permiso denegado |

## Fotos en el chat — ✅ ya aplicada

`20260925100000_chat_photos.sql`. Aplicada en producción antes de
publicar el código que la usa.

- `messages.image_path`: ruta de la foto en el almacén privado `chat`.
  Un `CHECK` exige que esté en la carpeta del **mismo espacio** que el
  mensaje (`<space_id>/<uuid>.jpg`), así que nadie puede enlazar en su
  mensaje una foto de otro espacio.
- El texto puede ir vacío solo si el mensaje lleva foto (sigue siendo
  máximo 2000 caracteres). Los mensajes antiguos siguen siendo válidos.
- Almacén `chat` **privado** (5 MB, solo JPEG), con las mismas reglas
  que `memories`: ver y subir solo en la carpeta de tu espacio, borrar
  solo tus propias fotos. Se ven con enlaces firmados de 1 hora.

Validada en Postgres 16 local, con todas las migraciones anteriores,
como Rokito, Giselz y una persona de otro espacio:

| Caso | Resultado |
|---|---|
| Foto con texto / foto sin texto | permitido / permitido |
| Mensaje vacío sin foto | rechazado por `messages_body_check` |
| Texto de 2001 caracteres con foto | rechazado por `messages_body_check` |
| Foto de otro espacio o ruta con `../` | rechazado por `messages_image_path_check` |
| Escribir como tu pareja / persona de fuera escribe | rechazado por RLS |
| Persona de fuera: leer vuestros mensajes | 0 filas |
| Tu pareja ve tu foto en el almacén | 1 visible |
| Persona de fuera: ver / subir en vuestra carpeta | 0 visibles / rechazado por RLS |
| Tu pareja borra tu foto / borras la tuya | 0 borradas / 1 borrada |

## Chat + notificaciones — ✅ ya aplicada

`20260924140000_chat_and_push.sql`. Aplicada en producción antes de
publicar el código que la usa, junto con `VAPID_PRIVATE_KEY` en Vercel.

- Tabla `messages` (chat) añadida a la publicación `supabase_realtime`:
  Supabase Realtime solo emite a cada persona los cambios que su RLS de
  `SELECT` le deja ver. Nadie edita mensajes; cada uno borra los suyos.
- Tabla `push_subscriptions` (una fila por dispositivo). Directamente,
  cada uno solo ve y borra las suyas. Tres funciones `SECURITY DEFINER`
  (solo para usuarios con sesión, revocadas para `anon`):
  `save_push_subscription` (si el mismo móvil ya estaba suscrito con la
  otra cuenta, pasa a quien tiene la sesión ahora),
  `partner_push_subscriptions` (solo las de quien comparte espacio
  contigo, nunca las tuyas ni las de nadie más) y
  `forget_partner_push_subscription` (limpia las caducadas).
- Esos datos no bastan para mandar notificaciones: hace falta la clave
  privada VAPID, que solo está en la variable `VAPID_PRIVATE_KEY` de
  Vercel.

Validada en Postgres 16 local (con un stub de la publicación
`supabase_realtime`), como Rokito, una persona de otro espacio y un
usuario sin sesión:

| Caso | Resultado |
|---|---|
| Leer / escribir en vuestro chat | 1 fila / permitido |
| Escribir como tu pareja | rechazado por RLS |
| Mensaje vacío | rechazado por la restricción `check` |
| Borrar o editar un mensaje de tu pareja | 0 filas |
| Ver suscripciones directamente | solo las tuyas |
| Destinos para avisar a la pareja | solo los de tu pareja |
| Borrar la suscripción de alguien de fuera | no la toca |
| Endpoint que no es `https://` | rechazado |
| Persona de fuera: leer chat / obtener destinos / escribir | 0 / ninguno / rechazado |
| Sin sesión (`anon`) llama a las funciones | permiso denegado |

## Portada del perfil + Recuerdos — ✅ ya aplicada

`20260924120000_profile_cover_and_memories.sql`. Aplicada en producción
antes de publicar el código que la usa (el Perfil lee `cover_url` y
Recuerdos usa la tabla y el bucket nuevos).

- `profiles.cover_url`: la foto de portada. La imagen va al bucket
  `avatars` (`<uuid>/cover`), que ya solo deja escribir en tu carpeta.
- Tabla `memories` + bucket **privado** `memories` (`<space_id>/<uuid>.jpg`):
  las fotos solo se ven con enlaces firmados y temporales que genera la
  app, nunca con una URL pública. Los dos veis todo; cada uno solo
  edita/borra lo que ha subido. La tabla además exige que la ruta de la
  foto esté en la carpeta de su propio espacio.
- `is_space_member_folder(text)`: como `is_space_member()` pero
  comparando como texto, para que una ruta con una carpeta que no es un
  uuid simplemente no coincida en vez de dar error.

Validada en Postgres 16 local con un *stub* de Supabase Storage
(`storage.buckets`, `storage.objects` con `owner_id`,
`storage.foldername()`), como Rokito, Giselz y una tercera persona de
otro espacio, cada caso en su propia transacción:

| Caso | Resultado |
|---|---|
| Subir foto a vuestra carpeta | permitido |
| Subir a la carpeta de otro espacio / a una ruta basura | rechazado (sin error de tipos) |
| Giselz ve la foto de Rokito | 1 fila |
| Giselz borra la foto / el recuerdo de Rokito | 0 filas |
| Giselz edita el pie de foto de Rokito | 0 filas |
| Rokito borra su propia foto / edita su pie | 1 fila |
| Crear un recuerdo a nombre de la pareja | rechazado por RLS |
| Recuerdo con ruta de otro espacio | rechazado por la restricción `check` |
| Persona de fuera ve fotos o recuerdos | 0 filas |
| Cambiar tu portada / la de tu pareja | 1 fila / 0 filas |

## El Trono, solo tus propios registros — ✅ ya aplicada

`20260924100000_poop_entries_own_only.sql`. Las políticas de `UPDATE`
y `DELETE` de `poop_entries` solo exigían ser miembro del espacio, así
que cualquiera de los dos podía borrar, editar o "regalar" registros
del otro llamando directamente a la API de Supabase (la app nunca lo
hacía, pero la base de datos lo permitía). Ahora además exigen
`user_id = auth.uid()`. Ver los registros de los dos no cambia (hace
falta para comparar estadísticas).

Validada en un Postgres 16 local, cada prueba en su propia transacción
y comparando antes/después con las mismas filas:

| Acción (como Rokito) | Antes | Después |
|---|---|---|
| Borrar un registro de Giselz | 1 fila | 0 filas |
| Editar un registro de Giselz | 1 fila | 0 filas |
| Pasarle un registro propio a Giselz | 1 fila | rechazado por RLS |
| Editar / borrar uno propio (deshacer) | 1 fila | 1 fila |
| Ver los registros de los dos | 2 | 2 |

Aplicada en producción y comprobado en vivo que registrar y "Deshacer"
siguen funcionando.

## Almacenamiento de avatares — ✅ ya aplicada

`20260923140000_avatar_storage.sql` (Fase 11) crea el bucket
`avatars` de Supabase Storage (público para lectura, solo fotos de
perfil, no datos sensibles) y las políticas RLS de `storage.objects`:
cada persona solo puede subir/reemplazar/borrar dentro de su propia
carpeta (`avatars/<su-uuid>/...`), nunca en la de su pareja. También
limita el tamaño (3 MB) y el tipo de archivo (solo imágenes) a nivel
de Supabase, no solo en el navegador.

`storage.objects` no la creamos nosotros (es infraestructura propia
de Supabase), así que para validarla se montó un *stub* local de esa
tabla + la función `storage.foldername()` que usa Supabase de verdad,
y se comprobó con datos reales: subir a tu propia carpeta funciona,
subir a la ajena falla, reemplazar tu propia foto funciona, borrar la
de tu pareja no afecta ninguna fila. El primer intento tenía un fallo
(faltaba la política de `SELECT`, y sin ella ni siquiera veías tu
propia foto) — se detectó y corrigió antes de dar la migración por
buena, no después.

## Dar de alta el Ratta Space (una sola vez) — ✅ ya hecho

`spaces` y `space_members` no tienen políticas de `INSERT` para la app:
la membresía se gestiona a mano, ya que solo existen dos personas y no
hay registro público. Tras crear las cuentas de Rocco y Giselz en
Supabase Auth (Fase 5), ejecuta en el SQL Editor (con sus UUID reales,
visibles en Authentication > Users):

```sql
insert into public.spaces (id, name, created_by)
values (gen_random_uuid(), 'Ratta Space', '<uuid de Rocco>')
returning id; -- guarda este id para el siguiente insert

insert into public.space_members (space_id, user_id, role) values
  ('<id del space anterior>', '<uuid de Rocco>', 'owner'),
  ('<id del space anterior>', '<uuid de Giselz>', 'member');
```

## `is_pinned` en `notes` — ✅ ya aplicada

`20260923120000_notes_pinning.sql` (Fase 10) añadió `is_pinned` a
`notes` para la función de fijar. Validada localmente antes de
aplicarla (migración + `UPDATE` respetando RLS), y confirmada
funcionando en producción.

## Cierre de seguridad en "Pregunta del día" — ✅ ya aplicada

`20260923130000_gate_question_answers_reveal.sql` (Fase 11, revisión
de seguridad). Hallazgo: el revelado de respuestas ("solo ves la de tu
pareja si ya has respondido tú") solo se aplicaba en
`QuestionOfTheDay.tsx`, no en la base de datos — la política
`question_answers_select_member` original solo comprobaba pertenencia
al espacio. Como la anon key es pública y cada usuario tiene su propio
token de sesión, cualquiera podía llamar a la API REST de Supabase
directamente y leer la respuesta ajena antes de responder, saltándose
la app por completo.

La migración añade una función `has_answered_round()` (`SECURITY
DEFINER`, mismo patrón que `is_space_member()`, necesaria para evitar
"infinite recursion detected in policy" al consultar `question_answers`
desde su propia política) y ajusta la política de `SELECT` para exigir
también que el usuario ya tenga su propia respuesta en esa ronda.

Validada localmente simulando el ataque exacto que encontró la
revisión: antes del fix, un usuario sin responder consultando
`question_answers` directamente veía la respuesta de su pareja (0
filas esperadas, filas reales encontradas); tras aplicar la migración,
la misma consulta devuelve 0 filas hasta que responde, y las 2
correctas después. No requiere ningún cambio en el código de la app.

## Cargar el banco de preguntas (una sola vez) — ✅ ya hecho

`questions` empieza vacía. Pega el contenido de `supabase/seed.sql`
(24 preguntas variadas) en el **SQL Editor**, una vez. Es contenido
compartido, no dato personal, pero se gestiona igual que el alta del
Ratta Space: a mano, nunca automáticamente desde la app. Puedes añadir
más preguntas después, en cualquier momento, con el mismo patrón
`insert into public.questions (text, category) values (...)`.

## Backups y restauración (Fase 15)

El **esquema** (tablas, RLS, funciones) ya está a salvo: vive en
`supabase/migrations/`, versionado en git. Si el proyecto de Supabase
desapareciera, se reconstruye entero aplicando esas migraciones en
orden a un proyecto nuevo.

Lo que **no** está respaldado en ningún sitio son los **datos**: las
notas, los registros de El Trono, las respuestas de Pregunta del día,
los mensajitos de cariño, las fotos de avatar. Eso solo existe dentro
de Supabase, y en el plan gratuito no hay copias automáticas — hay que
hacerlas a mano de vez en cuando.

### Opción A — con terminal (recomendada, lo respalda todo de una vez)

```bash
DATABASE_URL="postgresql://postgres:TU-PASSWORD@db.evmyyhjtycxdybdbmyjp.supabase.co:5432/postgres" \
  ./scripts/backup.sh
```

La cadena de conexión está en el panel de Supabase: **Project Settings
→ Database → Connection string → URI**. Usa la de "Direct connection"
o "Session pooler" (no la de "Transaction pooler", puerto 6543, que no
soporta `pg_dump`).

Esto genera un fichero `ratta-backup-AAAA-MM-DD_HHMM.sql` con todos los
datos (ya excluido de git en `.gitignore`, para no subir nunca datos
personales sin querer). Guárdalo en un sitio propio y privado — Google
Drive, iCloud, donde prefieras —, nunca en GitHub.

**Restaurar**: en un proyecto Supabase nuevo, aplicar las migraciones
(ver arriba) y luego cargar el volcado:

```bash
psql "$DATABASE_URL" -f ratta-backup-AAAA-MM-DD_HHMM.sql
```

### Opción B — sin terminal, desde el móvil o el navegador

Si no tienes un ordenador a mano con `pg_dump`/`psql` instalados,
Supabase permite exportar tabla por tabla desde el propio panel:
**Table Editor → (elige una tabla) → botón "Export data" → CSV**.

Tablas con datos personales que merece la pena exportar así de vez en
cuando: `notes`, `note_items`, `events`, `poop_entries`,
`question_rounds`, `question_answers`, `activity_log`, `profiles`.
(`spaces`, `space_members` y `questions` casi no cambian, y
`questions` además ya está en `supabase/seed.sql` — menos urgentes).

Para las fotos de perfil: **Storage → bucket `avatars`** → descargar
los archivos manualmente.

### Un aviso del plan gratuito

Los proyectos gratuitos de Supabase se **pausan solos tras ~1 semana
sin actividad**. Si algún día pasáis una temporada larga sin abrir la
app, entrad al panel de Supabase para reactivarlo antes de que os
extrañe que el login deje de funcionar — no es un fallo de la app, es
el proyecto dormido.

## Nota: StackBlitz no sirve para probar el login (usar Vercel)

El login (Fase 5) usa `middleware.ts`, que hace una llamada real a
`supabase.auth.getUser()` en cada petición. Probar esto en
**StackBlitz** (que simula Node.js dentro del navegador vía
WebContainers) produce un error interno de Next.js
(`Invariant: Expected workUnitAsyncStorage to have a store`) — un
fallo de compatibilidad conocido entre WebContainers y las APIs
internas de Next.js 15 relacionadas con `AsyncLocalStorage`, no un bug
en este código (verificado con un navegador real en un entorno de
desarrollo estándar: carga, hidratación, envío del formulario y manejo
de errores, todo correcto).

Por eso, para probar el login (y cualquier página protegida) en vivo,
se usa el despliegue de vista previa en **Vercel** en vez de
StackBlitz — adelantado desde la Fase 12 solo para poder probar esta
parte. Confirmado funcionando: login, Calendario y Notas, con las
cuentas reales de Rocco y Giselz.

**Importante sobre las URLs de Vercel**: cada despliegue individual
tiene una URL única que queda congelada para siempre en esa versión.
Para ver siempre la última versión de esta rama, usa la URL con
`-git-<rama>-` en el nombre (ej.
`ratta-app-git-claude-beautiful-mayer-5gaub5-<team>.vercel.app`), no
una URL de un despliegue concreto.

## Cómo se probaron estas migraciones

Antes de aplicarlas al proyecto real, se validaron contra un Postgres
16 local desechable (con un *stub* mínimo de `auth.users`/`auth.uid()`
imitando lo que Supabase provee de serie): las 3 migraciones aplican
sin errores, y una prueba de humo con tres usuarios en dos espacios
distintos confirmó el aislamiento por RLS (un usuario no ve ni puede
insertar datos en un espacio del que no es miembro).

Para la Fase 9 (Pregunta del día) se repitió el mismo método: se
aplicaron migraciones + `seed.sql` y se comprobó que las dos
restricciones clave de la lógica de "una ronda al día, una respuesta
por persona" funcionan de verdad a nivel de base de datos (no solo en
el código de la app): no se puede crear una segunda ronda el mismo día
para el mismo espacio, y no se puede responder dos veces a la misma
ronda.
