import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Lo mismo que supabase.auth.getUser() (misma respuesta), pero una sola vez
 * por carga de página. getUser() pregunta a Supabase por internet (así se
 * comprueba de verdad que la sesión es válida), y antes cada tarjeta de una
 * página lo pedía por su cuenta: en Inicio, unas 6 veces seguidas.
 *
 * Solo para leer en páginas y cargadores. Las acciones (guardar, borrar…)
 * siguen llamando a getUser() directamente.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
