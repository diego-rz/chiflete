import messages from "./messages/es.json";

/** Claves válidas del catálogo: una clave inexistente es un error de tipos (Principio VIII). */
export type MessageKey = keyof typeof messages;

/** Devuelve el texto del catálogo para la clave dada. El idioma inicial es el español (FR-030). */
export function t(key: MessageKey): string {
  return messages[key];
}
