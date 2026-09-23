/**
 * Clave pública VAPID: no es secreta (el navegador la necesita para
 * suscribirse). La privada va SOLO en la variable de entorno
 * VAPID_PRIVATE_KEY de Vercel, nunca en el código.
 */
export const VAPID_PUBLIC_KEY =
  "BOd3KoT7suzTyJfjLJvjjMbIsTVCGt3sDdhfyY56JWKvi7uXKNm5VGP_Y2t1cfI5go1mVRkGF2mPG7Q6YmnysCw";

// Contacto que exige el estándar para los servicios de push; se usa la
// URL de la app en vez de un email para no enviar datos personales.
export const VAPID_SUBJECT = "https://ratta-app.vercel.app";
