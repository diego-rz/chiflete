/**
 * Backend simulado para las pruebas E2E. Responde como el backend real según
 * contract/openapi.yaml. Las respuestas se tipan con los tipos generados del contrato
 * (`satisfies`), así que `tsc` falla si dejan de cumplirlo (Principio I).
 *
 * Se ejecuta con Node 24 sin compilar: `node tests/e2e/mock-backend.mts <puerto>`.
 */
import { createServer } from "node:http";
import type { components } from "../../src/lib/api-types";

type CitySearchPage = components["schemas"]["CitySearchPage"];
type CurrentWeather = components["schemas"]["CurrentWeather"];

const cordobaPage = {
  items: [
    { id: 3860259, name: "Córdoba", province: "Provincia de Córdoba", country: "Argentina", latitude: -31.4135, longitude: -64.18105 },
    { id: 2519240, name: "Córdoba", province: "Andalucía", country: "España", latitude: 37.89155, longitude: -4.77275 },
  ],
  hasMore: false,
} satisfies CitySearchPage;

const emptyPage = { items: [], hasMore: false } satisfies CitySearchPage;

const cordobaWeather = {
  measurementSystem: "METRIC",
  observedAt: "2026-11-01T02:00:00Z",
  stale: false,
  temperature: 20.8,
  precipitation: 0,
  windSpeed: 3.6,
  windDirection: 198,
  relativeHumidity: 69,
  pressure: 1010.9,
  visibility: 49.26,
} satisfies CurrentWeather;

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const port = Number(process.argv[2] ?? 4010);

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/health") {
    return json(res, 200, { status: "UP" });
  }
  if (url.pathname === "/api/v1/cities") {
    const query = (url.searchParams.get("query") ?? "").trim().toLowerCase();
    return json(res, 200, query.startsWith("cor") ? cordobaPage : emptyPage);
  }
  if (url.pathname === "/api/v1/current-weather") {
    return json(res, 200, cordobaWeather);
  }
  return json(res, 404, { code: "INVALID_REQUEST" });
}).listen(port, "127.0.0.1");
