import { getWrapped } from "@/lib/wrapped/get-wrapped";
import { WrappedStory } from "./WrappedStory";

export default async function WrappedPage() {
  const wrapped = await getWrapped();
  if (!wrapped) {
    return (
      <p className="mx-5 mt-10 text-sm" style={{ color: "var(--color-muted)" }}>
        No perteneces a ningún espacio todavía.
      </p>
    );
  }
  return <WrappedStory slides={wrapped.slides} />;
}
