import { BottomNav } from "@/components/navigation/BottomNav";

// La comprobación de sesión ya la hace middleware.ts en cada petición
// (incluida esta), así que repetirla aquí solo añadía una segunda
// llamada de red a Supabase Auth en cada navegación, sin ganar nada:
// este layout no usaba el usuario para nada más que ese chequeo.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex-1" style={{ paddingBottom: "calc(var(--nav-gap) + var(--nav-height) + 20px)" }}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
