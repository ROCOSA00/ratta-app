import { PageHeader } from "@/components/shared/PageHeader";
import { getPrefs } from "@/lib/prefs-server";
import { SettingsForm } from "./SettingsForm";

export default async function AjustesPage() {
  const prefs = await getPrefs();
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Deja Ratta a tu gusto" backHref="/perfil" />
      <SettingsForm initial={prefs} />
    </>
  );
}
