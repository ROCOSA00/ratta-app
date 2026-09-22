# Ratta App

> Nuestro pequeño mundo para dos.

Aplicación web privada para dos personas (Rocco y Giselz): calendario
compartido, notas, El Trono, pregunta del día y más. No hay registro
público; las cuentas se crean manualmente.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + Storage) — se configura en la Fase 3
- **Vercel** para el despliegue — Fase 12
- **Cloudflare** para el DNS del dominio `ratta.servidorcomponentes.com` — Fase 13

## Cómo ejecutar el proyecto (sin instalar nada en tu ordenador)

Este proyecto está pensado para ejecutarse en **StackBlitz**, que corre
Next.js completo dentro del navegador:

1. Sube este proyecto a un repositorio **privado** de GitHub llamado
   `ratta-app`.
2. Abre en el navegador:
   `https://stackblitz.com/github/TU-USUARIO/ratta-app`
3. StackBlitz instalará las dependencias y arrancará el servidor de
   desarrollo automáticamente. Verás la app en una vista previa dentro
   de la misma página.

Si en el futuro tienes Node.js instalado localmente, también funciona
de la forma tradicional:

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000`.

## Variables de entorno

Copia `.env.example` como `.env.local` y rellena los valores según las
instrucciones de la Fase 3. **Nunca subas `.env.local` a Git** (ya está
excluido en `.gitignore`).

## Estructura del proyecto

```
ratta-app/
├── public/               # archivos estáticos
├── src/
│   └── app/              # rutas (App Router de Next.js)
├── .env.example          # plantilla de variables de entorno (sin secretos)
└── README.md
```

A medida que avancen las fases se añadirán las carpetas `components/`,
`features/`, `lib/`, `server/`, `types/` y `supabase/` (migraciones).

## Progreso del proyecto

- [x] **Fase 0** — Entorno de desarrollo comprobado
- [x] **Fase 1** — Proyecto Next.js + Git inicializado
- [ ] **Fase 2** — Diseño base y navegación móvil
- [ ] **Fase 3** — Configuración de Supabase
- [ ] **Fase 4** — Esquema de base de datos y RLS
- [ ] **Fase 5** — Autenticación
- [ ] **Fase 6** — Calendario compartido
- [ ] **Fase 7** — Notas
- [ ] **Fase 8** — El Trono
- [ ] **Fase 9** — Pregunta del día
- [ ] **Fase 10** — Dashboard
- [ ] **Fase 11** — Testing, seguridad y pulido
- [ ] **Fase 12** — GitHub + Vercel
- [ ] **Fase 13** — Dominio en Cloudflare
- [ ] **Fase 14** — PWA
- [ ] **Fase 15** — Backups y documentación

## Notas de seguridad

- Todas las tablas de Supabase usan **RLS** (Row Level Security): un
  usuario solo puede acceder a los datos de un "espacio" (`space`) al
  que pertenece.
- Las claves administrativas de Supabase (`SUPABASE_SERVICE_ROLE_KEY`)
  solo se usan en el servidor y nunca se envían al navegador.
- No hay registro público: las cuentas se crean manualmente desde el
  panel de Supabase.
