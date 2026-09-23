export default function Loading() {
  return (
    <div className="animate-pulse px-5 pt-8">
      <div className="h-7 w-32 rounded-lg" style={{ background: "var(--color-line)" }} />
      <div className="mt-2 h-4 w-48 rounded-lg" style={{ background: "var(--color-line)" }} />

      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl"
            style={{ background: "color-mix(in srgb, var(--color-line) 70%, transparent)" }}
          />
        ))}
      </div>
    </div>
  );
}
