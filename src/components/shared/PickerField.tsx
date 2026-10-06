"use client";

import { CalendarDays, Clock } from "lucide-react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  type: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  /** Lo que se ve cuando está vacía ("Elige el día", "--:--"). */
  placeholder: string;
  /** Clases del contenedor (p. ej. flex-1 dentro de una fila). */
  wrapperClassName?: string;
};

/**
 * Casilla de fecha u hora que se ve igual en el iPhone y en el resto.
 * Safari en iOS, sin su aspecto nativo (que ignoraba el ancho), deja la
 * casilla vacía en blanco, sin icono ni texto: aquí siempre hay un icono y,
 * si está vacía, un texto de ayuda. Tocando en cualquier sitio se abre el
 * selector del móvil (o del navegador).
 */
export function PickerField({
  type,
  value,
  onChange,
  placeholder,
  className = "",
  wrapperClassName = "",
  style,
  ...rest
}: Props) {
  const Icon = type === "date" ? CalendarDays : Clock;
  return (
    <div className={`picker-field relative min-w-0 ${wrapperClassName}`}>
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-empty={value === "" ? "true" : undefined}
        className={`peer w-full min-w-0 pr-9 ${className}`}
        style={style}
      />
      {value === "" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm peer-focus:hidden"
          style={{ color: "var(--color-muted)" }}
        >
          {placeholder}
        </span>
      ) : null}
      <Icon
        aria-hidden
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--color-muted)" }}
      />
    </div>
  );
}
