# Ratta App

> Nuestro pequeño mundo para dos.

Aplicación web privada para dos personas (Rocco y Giselz): calendario
compartido, notas, El Trono, pregunta del día y más. No hay registro
público; las cuentas se crean manualmente.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS v3** (fijado a propósito: v4 tiene un bug conocido con el
  motor Oxide/WASM en algunos entornos)
- **Supabase** (PostgreSQL + Auth + Storage) — cliente conectado en la
  Fase 3, esquema y RLS en la Fase 4
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
│   ├── app/              # rutas (App Router de Next.js)
│   ├── components/       # componentes compartidos y de navegación
│   └── lib/
│       └── supabase/     # clientes de Supabase (browser y server)
├── .env.example          # plantilla de variables de entorno (sin secretos)
└── README.md
```

A medida que avancen las fases se añadirán las carpetas `features/`,
`server/` y `types/`.

## Progreso del proyecto

- [x] **Fase 0** — Entorno de desarrollo comprobado
- [x] **Fase 1** — Proyecto Next.js + Git inicializado
- [x] **Fase 2** — Diseño base y navegación móvil
- [x] **Fase 3** — Configuración de Supabase
- [x] **Fase 4** — Esquema de base de datos y RLS (migraciones en
  `supabase/migrations/`, aplicadas al proyecto Supabase real)
- [x] **Fase 5** — Autenticación (login, middleware y protección de
  rutas; cuentas de Rocco y Giselz creadas y Ratta Space dado de alta
  en Supabase; probado en vivo en Vercel — StackBlitz no sirve para
  probar esta parte, ver nota en `supabase/README.md`)
- [x] **Fase 6** — Calendario compartido (versión mínima: lista de
  próximos eventos + formulario de título/fecha/hora; probado en vivo;
  sin editar, borrar ni vista mensual todavía — siguiente iteración)
- [x] **Fase 7** — Notas (texto libre, lista + formulario de
  título/contenido, y fijar/desfijar una nota desde la Fase 10; sin
  checklists, archivar, editar ni borrar todavía — siguiente iteración)
- [x] **Fase 8** — El Trono (botón +1, estadísticas hoy/semana/mes/año,
  racha y logros humorísticos, comparativa entre los dos; probado en
  vivo)
- [x] **Fase 9** — Pregunta del día (ronda diaria automática, respuesta
  individual, revelado solo cuando ambos han contestado; banco de 24
  preguntas cargado y probado en vivo con las dos cuentas reales)
- [x] **Fase 10** — Dashboard (próximo evento, Pregunta del día
  respondible sin salir de Inicio, El Trono con botón +1 y racha, nota
  fijada; probado en vivo)
- [~] **Fase 11** — Testing, seguridad y pulido
  - [x] Revisión de seguridad: 1 fallo encontrado y corregido — el
    revelado de "Pregunta del día" solo se aplicaba en el componente,
    no en la base de datos; cerrado a nivel de RLS (ver
    `supabase/README.md`), pendiente de aplicar esa migración
  - [x] Pulido divertido (paquete 1): confeti de emojis al registrar
    en El Trono, mensajitos de cariño entre los dos (reutiliza
    `activity_log`, sin migración nueva), cambiar tu nombre desde "Más"
  - [~] Foto de perfil (avatar): bucket de Storage + subida desde
    "Más", solo puedes escribir en tu propia carpeta (probado con un
    stub local de `storage.objects`); pendiente de aplicar la
    migración
  - [x] Pulido visual: tarjetas con icono y tinte de color por
    sección (paleta existente, sin colores nuevos) en Inicio,
    Calendario, Notas y El Trono, en vez del blanco plano de antes
    ([PR #5](https://github.com/ROCOSA00/ratta-app/pull/5))
  - [ ] Minijuego (tipo Brick Breaker) con puntuaciones — descartado
    por ahora, se retoma si se pide más adelante
  - [ ] Tests automatizados (Vitest/Playwright)
- [x] **Fase 12** — GitHub + Vercel: repositorio privado en GitHub,
  despliegue automático en Vercel siguiendo la rama `main`, historial
  reconciliado (Fases 6-11 fusionadas vía PR #4 y PR #5) y confirmado
  en vivo que el "Production Branch" de Vercel es `main`
- [x] **Fase 13** — Dominio en Cloudflare: aparcada a petición del
  usuario; la URL de Vercel (`ratta-app.vercel.app`) es suficiente
  por ahora, se puede retomar más adelante si se quiere un dominio
  propio
- [x] **Fase 14** — PWA: manifest.json, iconos propios (192/512/apple
  touch icon) generados a partir del logo sobre el degradado de
  marca, y metadatos de instalación (modo standalone, barra de
  estado translúcida a juego con el `safe-area-inset` ya usado en
  cabeceras y nav) — instalable desde "Compartir → Añadir a pantalla
  de inicio" en iOS; sin caché offline (fuera de alcance, decisión
  del usuario)
- [ ] **Fase 15** — Backups y documentación

## Notas de seguridad

- Todas las tablas de Supabase usan **RLS** (Row Level Security): un
  usuario solo puede acceder a los datos de un "espacio" (`space`) al
  que pertenece.
- Las claves administrativas de Supabase (`SUPABASE_SERVICE_ROLE_KEY`)
  solo se usan en el servidor y nunca se envían al navegador.
- No hay registro público: las cuentas se crean manualmente desde el
  panel de Supabase.
