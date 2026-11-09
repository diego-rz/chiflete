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
  // 12 ciudades que empiezan por "San" para "Ver más resultados" (5, 10 y 12).
  { id: 3837213, name: "San Juan", province: "Provincia de San Juan", country: "Argentina", latitude: -31.5375, longitude: -68.53639 },
  { id: 4568127, name: "San Juan", country: "Puerto Rico", latitude: 18.46633, longitude: -66.10572 },
  { id: 3621849, name: "San José", province: "Provincia de San José", country: "Costa Rica", latitude: 9.93333, longitude: -84.08333 },
  { id: 5392171, name: "San José", province: "California", country: "Estados Unidos", latitude: 37.33939, longitude: -121.89496 },
  { id: 3583361, name: "San Salvador", province: "Departamento de San Salvador", country: "El Salvador", latitude: 13.68935, longitude: -89.18718 },
  { id: 3871336, name: "Santiago", province: "Región Metropolitana de Santiago", country: "Chile", latitude: -33.45694, longitude: -70.64827 },
  { id: 3492908, name: "Santo Domingo", province: "Distrito Nacional", country: "República Dominicana", latitude: 18.47186, longitude: -69.89232 },
  { id: 3836277, name: "Santa Fe", province: "Provincia de Santa Fe", country: "Argentina", latitude: -31.64881, longitude: -60.70868 },
  { id: 3836564, name: "San Miguel de Tucumán", province: "Provincia de Tucumán", country: "Argentina", latitude: -26.82414, longitude: -65.2226 },
  { id: 3837702, name: "San Fernando del Valle de Catamarca", province: "Provincia de Catamarca", country: "Argentina", latitude: -28.46957, longitude: -65.78524 },
  { id: 3109718, name: "San Sebastián", province: "País Vasco", country: "España", latitude: 43.31283, longitude: -1.97499 },
  { id: 3450554, name: "Santa Maria", province: "Rio Grande do Sul", country: "Brasil", latitude: -29.68417, longitude: -53.80694 },
  // Casos de US3: datos parciales y observación desactualizada.
  { id: 3833367, name: "Ushuaia", province: "Tierra del Fuego", country: "Argentina", latitude: -54.8, longitude: -68.3 },
  { id: 6255152, name: "Vostok", country: "Antártida", latitude: -78.46, longitude: 106.84 },
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
  [
    3833367,
    {
      measurementSystem: "METRIC",
      observedAt: "2026-11-01T02:00:00Z",
      stale: false,
      temperature: 4.2,
      precipitation: 0,
      windSpeed: 0,
      relativeHumidity: 77,
      pressure: 998.1,
    } satisfies CurrentWeather,
  ],
  [
    6255152,
    {
      measurementSystem: "METRIC",
      observedAt: "2026-10-31T18:00:00Z",
      stale: true,
      temperature: -52.3,
      precipitation: 0,
      windSpeed: 14.8,
      windDirection: 270,
      relativeHumidity: 60,
      pressure: 1002.4,
      visibility: 10,
    } satisfies CurrentWeather,
  ],
]);

/** Las búsquedas que empiezan por "error" simulan un proveedor caído. */
const providerDown = { code: "PROVIDER_UNAVAILABLE" } satisfies components["schemas"]["Error"];

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
    if (normalize(params.get("query") ?? "").trim().startsWith("error")) {
      return json(res, 502, providerDown);
    }
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
