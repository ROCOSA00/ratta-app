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

## Cargar el banco de preguntas (una sola vez, pendiente)

`questions` empieza vacía. Pega el contenido de `supabase/seed.sql`
(24 preguntas variadas) en el **SQL Editor**, una vez. Es contenido
compartido, no dato personal, pero se gestiona igual que el alta del
Ratta Space: a mano, nunca automáticamente desde la app. Puedes añadir
más preguntas después, en cualquier momento, con el mismo patrón
`insert into public.questions (text, category) values (...)`.

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
