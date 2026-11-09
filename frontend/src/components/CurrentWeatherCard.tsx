"use client";

import { cityRegion } from "@/components/CityResultList";
import { ErrorMessage } from "@/components/ErrorMessage";
import { StaleWarning } from "@/components/StaleWarning";
import { type MessageKey, t } from "@/i18n/t";
import type { components } from "@/lib/api-types";
import { formatNumber, formatObservedAt, toCardinal } from "@/lib/format";

type City = components["schemas"]["City"];
type CurrentWeather = components["schemas"]["CurrentWeather"];

interface Props {
  city: City;
  status: "loading" | "loaded" | "error";
  weather?: CurrentWeather;
  onRefresh: () => void;
}

/** Valor con su unidad, o "-" si el proveedor no lo informa; 0 se muestra como 0 (FR-018). */
function measure(value: number | undefined, unit: MessageKey): string {
  return value === undefined ? t("weather.missing") : `${formatNumber(value)} ${t(unit)}`;
}

function rows(weather: CurrentWeather): { label: MessageKey; value: string }[] {
  return [
    { label: "weather.temperature", value: measure(weather.temperature, "unit.celsius") },
    { label: "weather.precipitation", value: measure(weather.precipitation, "unit.millimeters") },
    { label: "weather.windSpeed", value: measure(weather.windSpeed, "unit.kmh") },
    {
      label: "weather.windDirection",
      value: weather.windDirection === undefined ? t("weather.missing") : t(toCardinal(weather.windDirection)),
    },
    { label: "weather.relativeHumidity", value: measure(weather.relativeHumidity, "unit.percent") },
    { label: "weather.pressure", value: measure(weather.pressure, "unit.hpa") },
    { label: "weather.visibility", value: measure(weather.visibility, "unit.kilometers") },
  ];
}

/**
 * Clima actual de la ciudad elegida (FR-012 a FR-019). La hora se formatea en el navegador, con la
 * zona horaria del dispositivo (FR-017). Si falla el proveedor, "Error interno" sustituye a los
 * datos y "Actualizar" permite reintentar (FR-022, FR-024).
 */
export function CurrentWeatherCard({ city, status, weather, onRefresh }: Props) {
  const region = cityRegion(city);
  return (
    <section aria-labelledby="weather-city" className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 id="weather-city" className="text-xl font-semibold break-words">
        {city.name}
      </h2>
      {region !== "" && <p className="text-sm break-words text-neutral-600 dark:text-neutral-400">{region}</p>}

      {status === "loading" && (
        <p role="status" className="mt-4 text-neutral-600 dark:text-neutral-400">
          {t("weather.loading")}
        </p>
      )}
      {status === "error" && (
        <>
          <ErrorMessage className="mt-4" />
          <RefreshButton onClick={onRefresh} />
        </>
      )}
      {status === "loaded" && weather !== undefined && (
        <>
          {weather.stale && <StaleWarning />}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {rows(weather).map(({ label, value }) => (
              <div key={label} className="contents">
                <dt className="text-sm text-neutral-600 dark:text-neutral-400">{t(label)}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
            {weather.observedAt !== undefined && (
              <div className="contents">
                <dt className="text-sm text-neutral-600 dark:text-neutral-400">{t("weather.observedAt")}</dt>
                <dd className="text-right">{formatObservedAt(weather.observedAt)}</dd>
              </div>
            )}
          </dl>
          <RefreshButton onClick={onRefresh} />
        </>
      )}
    </section>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 min-h-11 min-w-11 w-full rounded-lg border border-neutral-300 px-4 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
    >
      {t("weather.refresh")}
    </button>
  );
}
