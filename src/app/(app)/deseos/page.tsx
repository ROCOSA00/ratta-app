import { PageHeader } from "@/components/shared/PageHeader";
import { getWishes } from "@/lib/wishes/get-wishes";
import { WishForm } from "./WishForm";
import { WishList } from "./WishList";

export default async function DeseosPage() {
  const { wishes, names } = await getWishes();
  const done = wishes.filter((w) => w.done_at).length;

  return (
    <>
      <PageHeader
        title="Lista de deseos ✨"
        subtitle={wishes.length > 0 ? `${done} de ${wishes.length} cumplidos` : "Todo lo que queréis hacer juntos"}
        backHref="/perfil"
      />
      <div className="mt-4 flex flex-col gap-4 pb-4">
        <WishForm />
        <WishList wishes={wishes} names={names} />
      </div>
    </>
  );
}
