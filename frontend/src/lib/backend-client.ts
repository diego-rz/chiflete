/**
 * Llamada del servidor Next.js al backend (solo se usa desde los Route Handlers).
 *
 * - Lee `BACKEND_URL` en cada llamada, en tiempo de ejecución (research R8).
 * - Corta a los 5 s (FR-022a).
 * - Reenvía el estado y el cuerpo del backend sin redefinirlos (Principio I).
 * - Si el backend no responde a tiempo o es inaccesible, responde como él lo haría ante un fallo
 *   del proveedor: 504 PROVIDER_TIMEOUT o 502 PROVIDER_UNAVAILABLE, sin detalles (FR-022a, FR-023).
 * - Registra una línea JSON por llamada, sin la query string ni IPs (FR-028a, FR-028b).
 */

import type { components } from "@/lib/api-types";

type ErrorBody = components["schemas"]["Error"];

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
    if (isTimeout(error)) {
      log(operation, "TIMEOUT", started, 504);
      return errorResponse(504, { code: "PROVIDER_TIMEOUT" });
    }
    log(operation, "UNAVAILABLE", started, 502);
    return errorResponse(502, { code: "PROVIDER_UNAVAILABLE" });
  }
}

function errorResponse(status: number, body: ErrorBody): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
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
