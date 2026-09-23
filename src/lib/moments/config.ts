export const MOMENT_BUCKET = "moments";
/** Desde que suena, tenéis 10 minutos para llegar "a tiempo". */
export const MOMENT_WINDOW_SECONDS = 10 * 60;
// Una hora, como el resto de fotos privadas.
export const MOMENT_URL_SECONDS = 60 * 60;

/** "✅ A tiempo" o "⏰ 12 min tarde". */
export function lateLabel(lateSeconds: number): string {
  if (lateSeconds <= 0) return "✅ A tiempo";
  const minutes = Math.max(1, Math.round(lateSeconds / 60));
  if (minutes < 60) return `⏰ ${minutes} min tarde`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `⏰ ${hours} h${rest > 0 ? ` ${rest} min` : ""} tarde`;
}
