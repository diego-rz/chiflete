/**
 * Llamada del servidor Next.js al backend (solo se usa desde los Route Handlers).
 *
 * - Lee `BACKEND_URL` en cada llamada, en tiempo de ejecución (research R8).
 * - Corta a los 5 s (FR-022a).
 * - Reenvía el estado y el cuerpo del backend sin redefinirlos (Principio I).
 * - Registra una línea JSON por llamada, sin la query string ni IPs (FR-028a, FR-028b).
 */

export const BACKEND_TIMEOUT_MS = 5000;

export type Operation = "SEARCH" | "CURRENT_WEATHER";

type Outcome = "SUCCESS" | "ERROR" | "TIMEOUT" | "UNAVAILABLE";

export async function callBackend(operation: Operation, pathAndQuery: string): Promise<Response> {
  const started = performance.now();
  const url = `${process.env.BACKEND_URL ?? ""}${pathAndQuery}`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await response.text();
    log(operation, response.ok ? "SUCCESS" : "ERROR", started, response.status);
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType !== null) headers.set("content-type", contentType);
    return new Response(body, { status: response.status, headers });
  } catch (error) {
    log(operation, isTimeout(error) ? "TIMEOUT" : "UNAVAILABLE", started);
    throw error;
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

function log(operation: Operation, outcome: Outcome, started: number, status?: number): void {
  console.log(
    JSON.stringify({
      "@timestamp": new Date().toISOString(),
      "log.level": outcome === "SUCCESS" ? "INFO" : "WARN",
      operation,
      outcome,
      status,
      durationMs: Math.round(performance.now() - started),
    }),
  );
}
