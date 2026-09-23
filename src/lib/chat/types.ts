export type ChatMessage = {
  id: string;
  sender_id: string;
  /** Puede ir vacío si el mensaje es solo una foto. */
  body: string;
  /** Ruta en el almacén privado "chat" (<space_id>/<uuid>.jpg), o null. */
  image_path: string | null;
  /** Enlace firmado y temporal para ver la foto (el almacén es privado). */
  image_url: string | null;
  created_at: string;
};

export const CHAT_BUCKET = "chat";
export const CHAT_COLUMNS = "id, sender_id, body, image_path, created_at";
// Una hora, como en Recuerdos. Al volver a la app se piden enlaces nuevos.
export const SIGNED_URL_SECONDS = 60 * 60;
