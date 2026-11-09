"use client";

import { useState } from "react";
import { CitySearch } from "@/components/CitySearch";
import { CurrentWeatherCard } from "@/components/CurrentWeatherCard";
import { t } from "@/i18n/t";
import type { components } from "@/lib/api-types";
import { useLatestRequest } from "@/lib/use-latest-request";

type City = components["schemas"]["City"];
type CurrentWeather = components["schemas"]["CurrentWeather"];

type WeatherState =
  | { status: "idle" }
  | { status: "loading"; city: City }
  | { status: "loaded"; city: City; weather: CurrentWeather }
  | { status: "error"; city: City };

/**
 * Pantalla única. La ciudad elegida solo vive en memoria: nada se guarda en el navegador
 * (FR-026). El clima se pide con sus coordenadas al elegirla y al pulsar "Actualizar".
 */
export default function Home() {
  const [state, setState] = useState<WeatherState>({ status: "idle" });
  const { run } = useLatestRequest();

  function loadWeather(city: City) {
    // Pasa a "cargando" sin datos anteriores: nunca se muestran los de otra ciudad (Edge Cases).
    setState({ status: "loading", city });
    const params = new URLSearchParams({ latitude: String(city.latitude), longitude: String(city.longitude) });
    run(
      async (signal) => {
        const response = await fetch(`/api/current-weather?${params.toString()}`, { signal });
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as CurrentWeather;
      },
      (weather) => setState({ status: "loaded", city, weather }),
      () => setState({ status: "error", city }),
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
      <CitySearch onSelect={loadWeather} />
      {state.status === "loading" && (
        <CurrentWeatherCard city={state.city} status="loading" onRefresh={() => loadWeather(state.city)} />
      )}
      {state.status === "error" && (
        <CurrentWeatherCard city={state.city} status="error" onRefresh={() => loadWeather(state.city)} />
      )}
      {state.status === "loaded" && (
        <CurrentWeatherCard
          city={state.city}
          status="loaded"
          weather={state.weather}
          onRefresh={() => loadWeather(state.city)}
        />
      )}
    </main>
  );
}
