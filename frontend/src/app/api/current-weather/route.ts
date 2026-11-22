import type { operations } from "@/lib/api-types";
import { callBackend } from "@/lib/backend-client";

type WeatherQuery = operations["getCurrentWeather"]["parameters"]["query"];

/** GET /api/current-weather?latitude&longitude → backend GET /api/v1/current-weather. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query: WeatherQuery = {
    latitude: Number(params.get("latitude")),
    longitude: Number(params.get("longitude")),
  };
  const search = new URLSearchParams({
    latitude: String(query.latitude),
    longitude: String(query.longitude),
  });
  return callBackend("CURRENT_WEATHER", `/api/v1/current-weather?${search.toString()}`);
}
