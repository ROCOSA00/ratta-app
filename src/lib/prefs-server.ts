import { cookies } from "next/headers";
import { parsePrefs, PREFS_COOKIE, type Prefs } from "./prefs";

/** Los ajustes de este dispositivo, leídos de su cookie. */
export async function getPrefs(): Promise<Prefs> {
  const store = await cookies();
  return parsePrefs(store.get(PREFS_COOKIE)?.value);
}
