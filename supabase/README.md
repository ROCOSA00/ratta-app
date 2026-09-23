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

## Migración pendiente de aplicar: portada del perfil + Recuerdos

`20260924120000_profile_cover_and_memories.sql`. **Hay que aplicarla
antes de publicar el código que la usa** (el Perfil lee `cover_url` y
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

Pégala en el SQL Editor como las anteriores.

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
