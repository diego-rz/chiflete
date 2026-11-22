import type { MessageKey } from "@/i18n/t";

const CARDINAL_POINTS = [
  "cardinal.N",
  "cardinal.NE",
  "cardinal.E",
  "cardinal.SE",
  "cardinal.S",
  "cardinal.SO",
  "cardinal.O",
  "cardinal.NO",
] as const satisfies readonly MessageKey[];

/** Grados (de dónde viene el viento) → clave del catálogo de uno de los 8 puntos (FR-013). */
export function toCardinal(degrees: number): (typeof CARDINAL_POINTS)[number] {
  const sector = Math.round((((degrees % 360) + 360) % 360) / 45) % CARDINAL_POINTS.length;
  return CARDINAL_POINTS[sector] ?? "cardinal.N";
}

interface FormatOptions {
  /** Instante de referencia para decidir si es "hoy". */
  now?: Date;
  /** Idioma del formato; por defecto, el del dispositivo. */
  locale?: string;
}

/**
 * Hora de la observación en la zona horaria y el formato del dispositivo, no en los de la ciudad
 * (FR-017). Incluye la fecha si no es el día de hoy en el dispositivo (Edge Cases).
 */
export function formatObservedAt(iso: string, { now = new Date(), locale }: FormatOptions = {}): string {
  const observed = new Date(iso);
  const sameDay =
    observed.getFullYear() === now.getFullYear() &&
    observed.getMonth() === now.getMonth() &&
    observed.getDate() === now.getDate();
  const format = new Intl.DateTimeFormat(
    locale,
    sameDay ? { hour: "numeric", minute: "2-digit" } : { dateStyle: "medium", timeStyle: "short" },
  );
  return format.format(observed);
}

const numberFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 1, useGrouping: false });

/** Número en formato español con un decimal como máximo. */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
