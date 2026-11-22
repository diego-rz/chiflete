import type { components } from "@/lib/api-types";

export type City = components["schemas"]["City"];
export type CitySearchPage = components["schemas"]["CitySearchPage"];
export type CurrentWeather = components["schemas"]["CurrentWeather"];

export const cordoba = {
  id: 3860259,
  name: "Córdoba",
  province: "Provincia de Córdoba",
  country: "Argentina",
  latitude: -31.4135,
  longitude: -64.18105,
} satisfies City;

export const sanJuan = {
  id: 4568127,
  name: "San Juan",
  country: "Puerto Rico",
  latitude: 18.46633,
  longitude: -66.10572,
} satisfies City;

export const weather = {
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

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
