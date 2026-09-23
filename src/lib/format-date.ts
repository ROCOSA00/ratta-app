// El servidor (Vercel) renderiza en UTC, no en la hora de Rocco y
// Giselz: sin fijar esto, una cita a las 20:00 en Madrid se mostraría
// como 18:00 o 19:00 según la época del año.
export const TIME_ZONE = "Europe/Madrid";

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Convierte "YYYY-MM-DDTHH:mm" (la hora que la persona escribe en el
 * formulario, en hora de Madrid) al instante UTC real que hay que
 * guardar. Sin esto, el servidor (que corre en UTC) interpretaría esa
 * misma hora como si fuera UTC, desplazando cada cita 1-2 horas.
 */
export function zonedInputToUTC(naiveDateTime: string): Date {
  const asIfUTC = new Date(`${naiveDateTime}:00Z`);
  const zonedWallClock = asIfUTC.toLocaleString("en-US", { timeZone: TIME_ZONE });
  const offsetMs = new Date(`${zonedWallClock} UTC`).getTime() - asIfUTC.getTime();
  return new Date(asIfUTC.getTime() - offsetMs);
}

export function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}
