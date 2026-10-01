import { PageHeader } from "@/components/shared/PageHeader";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { todayKey } from "@/lib/calendar/date-utils";
import { capsuleDateOptions } from "@/lib/capsules/config";
import { CapsuleForm } from "./CapsuleForm";

export default async function NuevaCapsulaPage() {
  const spaceId = await getCurrentSpaceId();
  const today = todayKey();

  return (
    <>
      <PageHeader title="Nueva carta 💌" subtitle="Se quedará cerrada hasta el día que elijas" backHref="/capsulas" />
      <div className="mt-4 pb-4">
        {spaceId ? (
          <CapsuleForm spaceId={spaceId} today={today} options={capsuleDateOptions(today)} />
        ) : (
          <p className="mx-5 text-sm" style={{ color: "var(--color-muted)" }}>
            No perteneces a ningún espacio todavía.
          </p>
        )}
      </div>
    </>
  );
}
