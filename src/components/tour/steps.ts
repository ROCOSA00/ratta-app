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
    body: "Mes (con 💞 vuestro día 6 y 📸 los días con Momento Ratta), Semana y Lista (lo próximo). En Mes, toca un día para verlo.",
  },
  {
    id: "cal-new",
    path: "/calendario",
    target: "cal-new",
    action: "next",
    title: "Añadir un plan ➕",
    body: "Título, fecha y hora, y listo. Puede repetirse (cada sábado, cada mes…) y avisaros la noche antes. Toca cualquier plan para abrirlo y, desde ese día, añadirle fotos.",
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
 * Tutorial de novedades: lo nuevo desde el tutorial general. Cuando se
 * añadan más cosas, se cambia NEWS_VERSION y el aviso de «sorpresitas»
 * vuelve a salir una vez.
 */
export const NEWS_VERSION = "2026-10";

export const NEWS_STEPS: readonly TourStep[] = [
  {
    id: "news-welcome",
    path: "/inicio",
    action: "next",
    title: "🎁 ¡Sorpresitas nuevas!",
    body: "Te enseño todo lo nuevo de Ratta en un momento. Cuando algo brille, léelo y dale a «Siguiente», o tócalo si te lo pido.",
  },
  {
    id: "news-love-day",
    path: "/inicio",
    target: "next-event",
    action: "next",
    title: "Vuestro día 6 💞",
    body: "Cada día 6 es «DÍA CON EL AMOR DE MI VIDA»: todo el día, con su tarjeta de corazones, los meses que cumplís y un aviso la noche antes. Cuando es el próximo plan, sale así de bonito en Inicio.",
  },
  {
    id: "news-go-calendar",
    path: "/inicio",
    target: "nav-calendario",
    action: "tap",
    title: "Vamos al calendario 📅",
    body: "Toca «Calendario» en la barra de abajo.",
  },
  {
    id: "news-cal-month",
    path: "/calendario",
    target: "cal-views",
    action: "next",
    title: "Ahora se abre en el mes",
    body: "El calendario empieza en la vista de mes. Los días 6 salen marcados con 💞 y los de Momento Ratta con 📸. Toca un día para ver sus planes.",
  },
  {
    id: "news-cal-repeat",
    path: "/calendario",
    target: "cal-repeat",
    action: "next",
    title: "Planes que se repiten 🔁",
    body: "Un plan puede repetirse cada semana, cada 2 semanas, cada mes o cada año (hasta un día, si quieres). Y con «🔔 Avisarnos el día antes» os llega una notificación la noche anterior a las 20:00.",
  },
  {
    id: "news-cal-edit",
    path: "/calendario",
    action: "next",
    title: "Editar y «Esta vez no» ✏️",
    body: "Toca cualquier plan para abrirlo: ahí puedes editarlo y, si se repite, quitar solo un día con «Esta vez no» (por ejemplo, «este sábado no hay yoga»). Si te arrepientes, lo recuperas.",
  },
  {
    id: "news-go-chat",
    path: "/calendario",
    target: "nav-chat",
    action: "tap",
    title: "Ahora, el chat 💬",
    body: "Toca «Chat» en la barra de abajo.",
  },
  {
    id: "news-chat-react",
    path: "/chat",
    target: "chat-message",
    action: "next",
    title: "Reacciona y responde ❤️↩️",
    body: "Mantén pulsado cualquier mensaje: puedes reaccionar con ❤️😂😮😢🔥👍🐀, responderlo citado encima o copiar el texto. Tu pareja lo ve al momento.",
  },
  {
    id: "news-go-profile",
    path: "/chat",
    target: "nav-perfil",
    action: "tap",
    title: "Lo último está en tu perfil 🙋",
    body: "Toca «Perfil» en la barra de abajo.",
  },
  {
    id: "news-capsules",
    path: "/perfil",
    target: "perfil-capsulas",
    action: "next",
    title: "Cápsula del tiempo 💌",
    body: "Escribe una carta (con foto si quieres) que se queda cerrada hasta el día que elijas: vuestro aniversario, el próximo día 6… Tu pareja sabrá que existe, pero no lo que dice hasta ese día.",
  },
  {
    id: "news-wishes",
    path: "/perfil",
    target: "perfil-deseos",
    action: "next",
    title: "Lista de deseos ✨",
    body: "Sitios a los que ir, planes, pelis, comida… Tachadlos cuando los cumpláis (con celebración incluida) y conviértelos en plan del calendario con un toque.",
  },
  {
    id: "news-wrapped",
    path: "/perfil",
    target: "perfil-wrapped",
    action: "next",
    title: "Ratta Wrapped 🎁",
    body: "Vuestro año en resumen, como las historias: mensajes, Momentos, corazones, récords… Cada 6 de marzo sale el del año completo. ¡Ya podéis ver el de este año hasta hoy!",
  },
  {
    id: "news-end",
    path: "/perfil",
    action: "next",
    title: "¡Y esto es todo! 🎉",
    body: "Ah, y en el iPhone la fecha y la hora del calendario ya no se montan. Podéis repetir este tutorial cuando queráis desde Perfil → Cómo funciona Ratta. ¡A disfrutarlo!",
  },
];
