export function formatDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
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
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
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
