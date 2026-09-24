// A diferencia del layout, el template se vuelve a montar en cada cambio de
// pantalla: así cada pantalla nueva entra con un fundido (.page-in).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
