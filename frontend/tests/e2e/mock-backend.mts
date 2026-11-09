/**
 * Backend simulado para las pruebas E2E. Responde como el backend real según
 * contract/openapi.yaml. Las respuestas se tipan con los tipos generados del contrato
 * (`satisfies`), así que `tsc` falla si dejan de cumplirlo (Principio I).
 *
 * Se ejecuta con Node 24 sin compilar: `node tests/e2e/mock-backend.mts <puerto>`.
 */
import { createServer, type ServerResponse } from "node:http";
import type { components } from "../../src/lib/api-types";

type City = components["schemas"]["City"];
type CitySearchPage = components["schemas"]["CitySearchPage"];
type CurrentWeather = components["schemas"]["CurrentWeather"];

const cities = [
  { id: 3860259, name: "Córdoba", province: "Provincia de Córdoba", country: "Argentina", latitude: -31.4135, longitude: -64.18105 },
  { id: 2519240, name: "Córdoba", province: "Andalucía", country: "España", latitude: 37.89155, longitude: -4.77275 },
  { id: 3530240, name: "Córdoba", province: "Veracruz", country: "México", latitude: 18.88415, longitude: -96.92587 },
  { id: 3685533, name: "Córdoba", province: "Departamento de Córdoba", country: "Colombia", latitude: 8.33333, longitude: -75.66667 },
  { id: 3465328, name: "Cordobá", province: "Paraná", country: "Brasil", latitude: -25.6, longitude: -50.5 },
  { id: 3860260, name: "Cordobita", country: "Argentina", latitude: -30.1, longitude: -64.5 },
  { id: 3838583, name: "Rosario", province: "Provincia de Santa Fe", country: "Argentina", latitude: -32.94682, longitude: -60.63932 },
] satisfies City[];

const weatherByCityId = new Map<number, CurrentWeather>([
  [
    3860259,
    {
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
    } satisfies CurrentWeather,
  ],
  [
    3838583,
    {
      measurementSystem: "METRIC",
      observedAt: "2026-11-01T02:00:00Z",
      stale: false,
      temperature: 17.3,
      precipitation: 1.2,
      windSpeed: 12.4,
      windDirection: 90,
      relativeHumidity: 81,
      pressure: 1005.2,
      visibility: 12,
    } satisfies CurrentWeather,
  ],
]);

const defaultWeather = { measurementSystem: "METRIC", stale: false } satisfies CurrentWeather;

/** Igual que el proveedor: sin distinguir mayúsculas ni diacríticos, por inicio del nombre. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function search(query: string, offset: number, limit: number): CitySearchPage {
  const matches = cities.filter((city) => normalize(city.name).startsWith(normalize(query.trim())));
  return { items: matches.slice(offset, offset + limit), hasMore: matches.length > offset + limit };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const port = Number(process.argv[2] ?? 4010);

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const params = url.searchParams;
  if (url.pathname === "/health") {
    return json(res, 200, { status: "UP" });
  }
  if (url.pathname === "/api/v1/cities") {
    const page = search(params.get("query") ?? "", Number(params.get("offset") ?? 0), Number(params.get("limit") ?? 5));
    return json(res, 200, page);
  }
  if (url.pathname === "/api/v1/current-weather") {
    const latitude = Number(params.get("latitude"));
    const longitude = Number(params.get("longitude"));
    const city = cities.find((c) => c.latitude === latitude && c.longitude === longitude);
    return json(res, 200, (city && weatherByCityId.get(city.id)) ?? defaultWeather);
  }
  return json(res, 400, { code: "INVALID_REQUEST" });
}).listen(port, "127.0.0.1");
