import type { operations } from "@/lib/api-types";
import { callBackend } from "@/lib/backend-client";

type SearchQuery = operations["searchCities"]["parameters"]["query"];

/** La interfaz siempre muestra tandas de 5 resultados (FR-008, FR-009). */
const PAGE_SIZE = 5;

/** GET /api/cities?query&offset → backend GET /api/v1/cities (contract/openapi.yaml). */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query: SearchQuery = {
    query: params.get("query") ?? "",
    offset: Number(params.get("offset") ?? 0),
    limit: PAGE_SIZE,
  };
  const search = new URLSearchParams({
    query: query.query,
    offset: String(query.offset),
    limit: String(query.limit),
  });
  return callBackend("SEARCH", `/api/v1/cities?${search.toString()}`);
}
