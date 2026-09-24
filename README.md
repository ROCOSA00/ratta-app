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
- **Cloudflare** para el DNS de un dominio propio — Fase 13, aparcada
  por ahora (la URL de Vercel es suficiente)

## Arquitectura: cómo encaja todo

```
   tú escribes en el chat de Claude Code
                  │
                  ▼
   Claude edita el código en este repositorio
                  │
                  ▼ (git push a una rama, luego PR a main)
              GitHub  ── guarda todo el código y su historial
                  │
                  ▼ (cada merge a main dispara un despliegue)
              Vercel  ── construye la app y la sirve en
                         ratta-app.vercel.app
                  │
                  ▼ (la app llama a Supabase desde el navegador/servidor)
             Supabase  ── base de datos (Postgres + RLS), login,
                         y las fotos de avatar (Storage)
```

Ni tú ni Claude tocáis nunca la base de datos a mano desde el panel de
Supabase para cambios de esquema: cada cambio es una migración nueva
en `supabase/migrations/`, así que el repositorio de GitHub siempre
puede reconstruir el proyecto entero desde cero (ver "Backups y
restauración" en `supabase/README.md`).

## Cómo ejecutar el proyecto

El desarrollo real de este proyecto lo hace Claude Code directamente
contra GitHub y Vercel, así que normalmente no hace falta instalar
nada — abres `ratta-app.vercel.app` (o la URL de vista previa de la
rama en la que se esté trabajando) y ya está.

Si alguna vez quieres correrlo tú en tu propio ordenador:

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000`. (StackBlitz, que corre Next.js
dentro del navegador sin instalar nada, funciona para páginas simples,
pero **no** para el login ni ninguna página que requiera sesión — ver
la nota al respecto en `supabase/README.md`.)

## Pruebas automáticas

```bash
npm test
```

Comprueba en menos de un segundo, sin tocar la base de datos real, que
cada acción de la app (crear, editar y borrar notas, listas, planes,
registros de El Trono, respuestas, mensajitos, nombre, contraseña...)
hace exactamente lo que debe con los datos tal como los envía cada
formulario, y que las fechas se calculan en hora de Madrid. Supabase se
sustituye por uno falso que solo apunta lo que se le pide
(`tests/helpers/fake-supabase.ts`). Se ejecuta antes de cada cambio,
junto con `npm run lint`, `npx tsc --noEmit` y `npm run build`.

## Variables de entorno

Copia `.env.example` como `.env.local` y rellena los valores según las
instrucciones de la Fase 3. Para las notificaciones, en Vercel hace falta
además `VAPID_PRIVATE_KEY` (secreta; la pública está en
`src/lib/push/config.ts`). **Nunca subas `.env.local` a Git** (ya está
excluido en `.gitignore`).

## Estructura del proyecto

```
ratta-app/
├── public/              # iconos, manifest.json, logo, sw.js (notificaciones)
├── scripts/
│   └── backup.sh        # copia de seguridad de los datos (Fase 15)
├── supabase/
│   ├── migrations/      # esquema y RLS, versionados
│   ├── seed.sql         # banco de preguntas de "Pregunta del día"
│   └── README.md        # cómo aplicar migraciones, backups, notas operativas
├── src/
│   ├── app/
│   │   ├── (app)/       # páginas protegidas: inicio, calendario, notas,
│   │   │                #   juegos (El Trono), perfil, recuerdos, chat
│   │   └── login/       # página de acceso
│   ├── components/
│   │   ├── features/    # componentes compartidos entre Inicio y sus páginas
│   │   ├── navigation/  # barra inferior
│   │   └── shared/      # cabecera, logo
│   └── lib/             # lógica de servidor por dominio: auth, events,
│                        #   notes, nudges, poop, profile, questions,
│                        #   spaces, supabase (clientes browser/server)
├── tests/               # pruebas automáticas (npm test)
├── middleware.ts        # protección de rutas + refresco de sesión
├── .env.example         # plantilla de variables de entorno (sin secretos)
└── README.md
```

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
    no en la base de datos; cerrado a nivel de RLS y migración
    aplicada en producción (ver `supabase/README.md`)
  - [x] Pulido divertido (paquete 1): confeti de emojis al registrar
    en El Trono, mensajitos de cariño entre los dos (reutiliza
    `activity_log`, sin migración nueva), cambiar tu nombre desde "Más"
  - [x] Cambiar contraseña desde "Más": pide la contraseña actual antes
    de aceptar la nueva (evita que alguien con el móvil desbloqueado y
    la sesión abierta pueda cambiarla sin saberla), y cierra la sesión
    al terminar para confirmar que la nueva funciona de verdad. Usa
    `auth.updateUser()` de Supabase, sin tabla ni migración propia
  - [x] Foto de perfil (avatar): bucket de Storage + subida desde
    "Más", solo puedes escribir en tu propia carpeta (probado con un
    stub local de `storage.objects`); migración aplicada y probada
    en vivo
  - [x] Pulido visual: tarjetas con icono y tinte de color por
    sección (paleta existente, sin colores nuevos) en Inicio,
    Calendario, Notas y El Trono, en vez del blanco plano de antes
    ([PR #5](https://github.com/ROCOSA00/ratta-app/pull/5))
  - [ ] Minijuego (tipo Brick Breaker) con puntuaciones — descartado
    por ahora, se retoma si se pide más adelante
  - [x] Tests automatizados con Vitest (`npm test`): todas las acciones
    del servidor y la lógica de fechas, El Trono y días juntos
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
- [x] **Fase 15** — Backups y documentación: el esquema ya vivía en
  git (`supabase/migrations/`); se añadió `scripts/backup.sh` para
  respaldar los datos (con alternativa sin terminal vía Table Editor),
  instrucciones de restauración, y una sección de arquitectura en
  este README explicando cómo encajan GitHub, Vercel y Supabase —
  ver el detalle completo en `supabase/README.md`

## Mejoras posteriores a la Fase 15

Con las 15 fases completas, la app sigue evolucionando con mejoras
puntuales según se van usando:

- **Rendimiento**: la navegación entre pestañas comprobaba la sesión
  dos veces por click (middleware + layout duplicado); se eliminó la
  comprobación repetida y se añadió una pantalla de carga instantánea
  ([PR #10](https://github.com/ROCOSA00/ratta-app/pull/10)).
- **Borrar**: notas y eventos del calendario ahora se pueden borrar
  (con confirmación), usando las políticas RLS de `DELETE` que ya
  existían desde la Fase 4.
- **Calendario**: vista de mes (rejilla) y semana, además de la lista
  original; ubicación y descripción en los eventos; corregido un bug
  real de zona horaria (el servidor corre en UTC, no en hora de
  Madrid — las horas podían mostrarse o guardarse desplazadas 1-2h).
- **Notas**: página de detalle para ver/editar una nota completa (antes
  solo se veían 3 líneas sin poder editar), y un nuevo tipo "lista"
  con casillas, usando la tabla `note_items` que existía desde la
  Fase 4 sin usarse.
- **Fuente y cabecera**: títulos en Quicksand (redondeada) en vez de
  Fraunces; corregido que la cabecera tapaba el principio de cada
  pantalla en iOS; cabecera translúcida y respuesta táctil al pulsar
  ([PR #12](https://github.com/ROCOSA00/ratta-app/pull/12)).
- **El Trono**: "Deshacer" durante 8 s tras registrar, gráfica de los
  últimos 7 días, récord diario y logros nuevos; estadísticas por día
  de Madrid (antes "hoy" y la racha cambiaban a la 01:00-02:00 UTC).
  Inicio saluda por tu nombre y cuenta los días hasta el próximo plan;
  Notas tiene buscador y progreso de las listas
  ([PR #13](https://github.com/ROCOSA00/ratta-app/pull/13)).
- **Seguridad**: en El Trono cada uno solo puede editar o borrar sus
  propios registros, también a nivel de base de datos (RLS)
  ([PR #14](https://github.com/ROCOSA00/ratta-app/pull/14)).
- **Revisión a fondo**: crear una **Lista** fallaba ("expected string,
  received null") porque en ese modo el formulario no envía el campo de
  contenido; lo mismo pasaba con los planes de **todo el día** y la hora.
  Arreglados, y cubiertos por 45 pruebas automáticas que se comprobó que
  fallan sin el arreglo. También: la Pregunta del día cambiaba a la
  01:00-02:00 (UTC) en vez de a medianoche en Madrid, y una lista fijada
  salía vacía en Inicio.
- **Perfil, música y recuerdos**: "Más" pasa a ser **Perfil**, con foto de
  portada y un diseño nuevo (`/mas` redirige a `/perfil`). Inicio muestra
  vuestra playlist de Spotify y un **recuerdo del día**. Nueva galería
  **Recuerdos** con fotos privadas (bucket privado + enlaces firmados).
  Las fotos se reducen en el móvil antes de subirlas, lo que además
  quita la ubicación GPS que llevan dentro.
- **Chat y notificaciones**: chat privado en tiempo real (Supabase
  Realtime) y notificaciones push (Web Push + service worker) cuando tu
  pareja te escribe, te manda cariño, añade un plan, nota o recuerdo,
  responde la pregunta del día (sin revelar la respuesta) o visita El
  Trono. Requiere la variable `VAPID_PRIVATE_KEY` en Vercel; en iPhone,
  la app instalada en la pantalla de inicio (iOS 16.4+).
- **Más mensajitos**: 22 mensajitos en tres grupos (Cariño, Planes,
  Tonterías) dentro de un selector plegable, para no llenar Inicio de
  botones. La lista vive en `src/lib/nudges/options.ts`; el móvil solo
  envía la clave y el servidor pone el emoji y el texto, así nadie puede
  colar un mensaje inventado en la notificación.
- **Barra flotante**: la barra de abajo pasa a ser una píldora flotante
  (tipo "globo") separada de los bordes. Su altura y separación viven en
  `--nav-height` y `--nav-gap` (`globals.css`), que también usan el
  hueco final de cada pantalla y la barra de escribir del chat.
- **Fotos en el chat**: botón 📷 para mandar fotos (con texto opcional),
  que se reducen en el móvil antes de subirse (sin GPS) a un almacén
  privado `chat`, y se ven con enlaces firmados de 1 hora. Toca una foto
  para verla en grande. Migración `20260925100000_chat_photos.sql`.
- **Juegos**: la pestaña pasa a ser un menú con dos juegos. **El Trono**
  se mueve a `/juegos/trono` y hay uno nuevo, **Corazones**
  (`/juegos/corazones`): pulsa sin parar para mandar corazones, con
  ranking de hoy, semana, mes y total. Los toques se agrupan en paquetes
  antes de enviarse. Migración `20260925120000_hearts_game.sql`.
- **Fotos en los planes**: cada plan tiene su página (`/calendario/[id]`)
  y, desde el día del plan, se le pueden añadir varias fotos (almacén
  privado `event-photos`). Las tarjetas de plan muestran "📸 N fotos".
  Migración `20260926100000_event_photos.sql`.
- **Momento Ratta** (BeReal): cada día, a una hora al azar entre las
  10:00 y las 22:00, suena para los dos y hay 10 minutos para subir una
  foto (solo cámara) de lo que estáis haciendo. La de tu pareja no se ve
  hasta que subes la tuya. Página `/momento`, aviso en Inicio y los días
  con 📸 en el calendario. El despertador es `pg_cron` en Supabase, que
  llama a `/api/momento` con una clave compartida (`MOMENT_CRON_SECRET`).
  Migración `20260927100000_momento_ratta.sql` + `setup/momento_despertador.sql`.
- **Flappy Rata** (`/juegos/flappy`): tercer juego, un Flappy Bird con la
  rata en un `<canvas>`, con física a paso fijo (`src/lib/flappy/engine.ts`,
  igual en pantallas de 60 y 120 Hz) y récords de los dos; si le quitas el
  récord a tu pareja, le llega un aviso. Migración
  `20260928100000_game_scores.sql`.
- **Inicio siempre al día**: al volver a la app (instalada, en segundo
  plano) cada pantalla recarga sus datos (`AutoRefresh` en el layout), e
  Inicio además cada minuto mientras lo miras. Antes, El Trono en Inicio
  se quedaba con los datos de cuando lo abriste.
- **Barra con movimiento y mensajes pendientes**: la pastilla de la
  pestaña activa se desliza con un pequeño rebote, el icono da un saltito
  y cada pantalla entra con un fundido (`template.tsx`; solo opacidad, para
  no descolocar lo que va fijo). El Chat muestra un globo rojo con los
  mensajes sin leer, al instante con Supabase Realtime. Migración
  `20260929100000_chat_reads.sql`.
- **Pantalla de carga al abrir la app**: logo en el centro y una barra de
  progreso (`SplashScreen`, menos de 1,5 s). Solo al abrir la app, no al
  cambiar de pestaña; si el JavaScript no llegara a quitarla, el CSS la
  oculta solo a los 3 s.
- **Ajustes** (`/perfil/ajustes`): tema Auto/Claro/Oscuro, letra grande,
  reducir animaciones, pantalla de carga, vibración y qué tarjetas ver en
  Inicio. Se guardan por dispositivo en una cookie (`src/lib/prefs.ts`),
  así el servidor pinta ya el `<html>` con el tema elegido (sin parpadeo).
  `color-scheme` va con el tema para que los controles nativos (fecha,
  hora, casillas) también cambien. Comprobado píxel a píxel: el tema
  elegido a mano se ve igual que el del sistema.
- **Tutorial interactivo** (`src/components/tour/`): resalta cada cosa y
  te hace tocar las pestañas para ir de pantalla en pantalla (16 pasos).
  Se ofrece al entrar por primera vez y se puede repetir desde Ajustes o
  desde «Cómo funciona Ratta».
- **Carnet de Ratta y estado de ánimo**: tocando la cara o el nombre de
  tu pareja en el chat se abre su carnet holográfico en 3D
  (`MemberCard`: se gira arrastrando, se da la vuelta tocándolo). En
  Perfil eliges tu estado («Enamorado/a», «Cagón/a»…, con nota) y ves tu
  propio carnet. Migración `20260930100000_profile_status.sql`.
- **Más rápida**: `getCurrentSpaceId()` y el usuario de la sesión
  (`getAuthUser()`) se piden una sola vez por carga de página (`cache()`
  de React; antes Inicio preguntaba ~6 veces quién eras y ~8 en qué
  espacio). El calendario pide planes y Momentos a la vez, cambia de
  vista al instante y precarga las otras vistas y el mes anterior y
  siguiente.
- **Servidor junto a la base de datos**: `vercel.json` fija la región de
  las funciones de Vercel en Dublín (`dub1`), al lado de Supabase (EU
  West). Por defecto Vercel las ejecuta en Washington (`iad1`) y cada
  consulta cruzaba el Atlántico.

## Notas de seguridad

- Todas las tablas de Supabase usan **RLS** (Row Level Security): un
  usuario solo puede acceder a los datos de un "espacio" (`space`) al
  que pertenece.
- Las claves administrativas de Supabase (`SUPABASE_SERVICE_ROLE_KEY`)
  solo se usan en el servidor y nunca se envían al navegador.
- No hay registro público: las cuentas se crean manualmente desde el
  panel de Supabase.
