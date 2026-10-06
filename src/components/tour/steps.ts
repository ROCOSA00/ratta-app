/**
 * Pasos del tutorial interactivo. Cada paso resalta un elemento marcado
 * con data-tour="<target>" en la página `path`:
 * - action "next": se lee y se pulsa «Siguiente».
 * - action "tap": hay que tocar lo resaltado (normalmente una pestaña de
 *   la barra de abajo), y el tutorial sigue en la pantalla nueva.
 * Sin `target`, la tarjeta sale centrada (bienvenida y despedida).
 */
export type TourStep = {
  id: string;
  path?: string;
  target?: string;
  action: "next" | "tap";
  title: string;
  body: string;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    path: "/inicio",
    action: "next",
    title: "¡Hola! 👋 Te enseño Ratta",
    body: "Vamos a dar una vuelta por la app. Cuando algo brille, léelo y dale a «Siguiente», o tócalo si te lo pido.",
  },
  {
    id: "together",
    path: "/inicio",
    target: "together",
    action: "next",
    title: "Vuestros días juntos 💞",
    body: "Aquí veis cuántos días lleváis juntos desde el 6 de marzo de 2026 y cuánto falta para el siguiente hito.",
  },
  {
    id: "next-event",
    path: "/inicio",
    target: "next-event",
    action: "next",
    title: "Vuestro próximo plan 📅",
    body: "El siguiente plan del calendario, con la cuenta atrás. Tocándolo lo abres con sus detalles y sus fotos.",
  },
  {
    id: "question",
    path: "/inicio",
    target: "question",
    action: "next",
    title: "La pregunta del día ❓",
    body: "Cada día, una pregunta nueva. La respuesta de tu pareja no se ve hasta que respondes la tuya.",
  },
  {
    id: "nudge",
    path: "/inicio",
    target: "nudge",
    action: "next",
    title: "Mensajitos de cariño 💌",
    body: "Toca «Mandar un mensajito», elige uno (¿Pijamada?, Tengo hambre…) y a tu pareja le llega una notificación.",
  },
  {
    id: "trono",
    path: "/inicio",
    target: "trono",
    action: "next",
    title: "El Trono 👑",
    body: "Cada vez que vayas al baño, dale al +. Aquí veis quién va ganando hoy y vuestras rachas.",
  },
  {
    id: "go-chat",
    path: "/inicio",
    target: "nav-chat",
    action: "tap",
    title: "Vamos al chat 💬",
    body: "Toca «Chat» en la barra de abajo. Si tienes mensajes sin leer, ahí sale un globo rojo con cuántos.",
  },
  {
    id: "chat-photo",
    path: "/chat",
    target: "chat-photo",
    action: "next",
    title: "Vuestro chat privado 📷",
    body: "Escribe abajo y los mensajes llegan al instante. Con este botón mandas fotos; tocándolas se ven en grande.",
  },
  {
    id: "chat-card",
    path: "/chat",
    target: "chat-card",
    action: "next",
    title: "Su carnet de Ratta 🪪",
    body: "Toca su cara o su nombre y verás su carnet holográfico: gíralo con el dedo. Debajo del nombre sale su estado de ánimo.",
  },
  {
    id: "go-calendar",
    path: "/chat",
    target: "nav-calendario",
    action: "tap",
    title: "Ahora, el calendario 📅",
    body: "Toca «Calendario» en la barra de abajo.",
  },
  {
    id: "cal-views",
    path: "/calendario",
    target: "cal-views",
    action: "next",
    title: "Tres formas de verlo",
    body: "Mes (con 💞 vuestro día 6, 📸 los días con Momento Ratta y 🖼️ los que tienen fotos), Semana y Lista. En Mes, toca un día: verás sus planes, la pregunta del día que respondisteis y sus fotos (podéis añadir las que queráis, porque sí).",
  },
  {
    id: "cal-new",
    path: "/calendario",
    target: "cal-new",
    action: "next",
    title: "Crear un plan ➕",
    body: "Toca «Crear un plan» y te explica cada cosa: título, día y hora, si se repite (cada sábado, cada mes…) y si os avisa la noche antes. Toca cualquier plan para abrirlo, editarlo o añadirle fotos.",
  },
  {
    id: "go-games",
    path: "/calendario",
    target: "nav-juegos",
    action: "tap",
    title: "¡A jugar! 🎮",
    body: "Toca «Juegos» en la barra de abajo.",
  },
  {
    id: "games",
    path: "/juegos",
    target: "games",
    action: "next",
    title: "Vuestros juegos",
    body: "El Trono, Corazones (pulsa sin parar) y Flappy Rata. Todos con ranking: si le quitas el récord a tu pareja, se entera. 😈",
  },
  {
    id: "go-profile",
    path: "/juegos",
    target: "nav-perfil",
    action: "tap",
    title: "Por último, tu perfil 👤",
    body: "Toca «Perfil» en la barra de abajo.",
  },
  {
    id: "settings",
    path: "/perfil",
    target: "settings",
    action: "next",
    title: "Ajustes ⚙️",
    body: "Tema claro u oscuro, letra más grande, qué tarjetas ver en Inicio… y desde aquí puedes repetir este tutorial. En Perfil también eliges tu estado de ánimo.",
  },
  {
    id: "done",
    action: "next",
    title: "¡Ya lo sabes todo! 🎉",
    body: "Y cada día, a una hora sorpresa, sonará el Momento Ratta 📸. Si tienes dudas: Perfil → «Cómo funciona Ratta».",
  },
];

/**
 * Tutorial de novedades: solo lo último. Cuando se añadan más cosas, se
 * cambian NEWS_VERSION, NEWS_ITEMS y NEWS_STEPS, y el aviso de
 * «sorpresitas» vuelve a salir una vez.
 */
export const NEWS_VERSION = "2026-10-kofi";

/** Lo que enseña el aviso de «sorpresitas». */
export const NEWS_ITEMS = [
  { emoji: "🐱", label: "El rincón de Kofi" },
  { emoji: "🎂", label: "Sus cumplemeses" },
  { emoji: "📸", label: "Kofi creciendo" },
  { emoji: "⚖️", label: "Su peso y diario" },
  { emoji: "💅", label: "Reto de las uñas" },
  { emoji: "👀", label: "¡Te pillé mordiéndolas!" },
] as const;

export const NEWS_STEPS: readonly TourStep[] = [
  {
    id: "news-welcome",
    path: "/inicio",
    action: "next",
    title: "🎁 ¡Más sorpresitas!",
    body: "Te enseño lo último de Ratta en un momento. Cuando algo brille, léelo y dale a «Siguiente», o tócalo si te lo pido.",
  },
  {
    id: "news-pet",
    path: "/inicio",
    target: "pet",
    action: "next",
    title: "¡Kofi tiene su rincón! 🐱",
    body: "Aquí veis cuánto tiene vuestra bolita y cuándo cumple meses (cada día 15). El día que los cumple, la tarjeta se pone de fiesta 🎉 Tocándola entráis en su ficha.",
  },
  {
    id: "news-go-profile",
    path: "/inicio",
    target: "nav-perfil",
    action: "tap",
    title: "Vamos a tu perfil 🙋",
    body: "Toca «Perfil» en la barra de abajo.",
  },
  {
    id: "news-pet-profile",
    path: "/perfil",
    target: "perfil-mascota",
    action: "next",
    title: "La ficha de Kofi 🐾",
    body: "Su foto (tocadla para cambiarla), su edad en años humanos, los días que lleva en casa, un álbum donde cada foto dice qué edad tenía, su peso con una gráfica y un diario de vacunas, veterinario y primeras veces. Su cumpleaños (15 de agosto) ya está en el calendario 🎂",
  },
  {
    id: "news-go-games",
    path: "/perfil",
    target: "nav-juegos",
    action: "tap",
    title: "Ahora, a Juegos 🎮",
    body: "Toca «Juegos» en la barra de abajo.",
  },
  {
    id: "news-nails",
    path: "/juegos",
    target: "games-nails",
    action: "next",
    title: "Reto de las uñas 💅",
    body: "Días sin morderse las uñas, con racha 🔥, medallas y un calendario verde y rojo. Y tu pareja también puede apuntar cuando te pilla mordiéndotelas 👀 (te llega un aviso).",
  },
  {
    id: "news-end",
    path: "/juegos",
    action: "next",
    title: "¡Y esto es todo! 🎉",
    body: "Podéis repetir este tutorial cuando queráis desde Perfil → Cómo funciona Ratta. ¡Dadle un achuchón a Kofi de nuestra parte! 🐱",
  },
];
