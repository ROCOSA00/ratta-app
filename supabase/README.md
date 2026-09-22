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

## Dar de alta el Ratta Space (una sola vez)

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

## Cómo se probaron estas migraciones

Antes de aplicarlas al proyecto real, se validaron contra un Postgres
16 local desechable (con un *stub* mínimo de `auth.users`/`auth.uid()`
imitando lo que Supabase provee de serie): las 3 migraciones aplican
sin errores, y una prueba de humo con tres usuarios en dos espacios
distintos confirmó el aislamiento por RLS (un usuario no ve ni puede
insertar datos en un espacio del que no es miembro).
