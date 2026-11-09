import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurrentWeatherCard } from "@/components/CurrentWeatherCard";
import { t } from "@/i18n/t";
import { formatObservedAt } from "@/lib/format";
import { cordoba, weather } from "./fixtures";

describe("CurrentWeatherCard", () => {
  it("muestra la ciudad, los siete datos con su unidad y la hora de observación", () => {
    render(<CurrentWeatherCard city={cordoba} status="loaded" weather={weather} onRefresh={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Córdoba" })).toBeTruthy();
    expect(screen.getByText(`Provincia de Córdoba${t("list.separator")}Argentina`)).toBeTruthy();
    expect(screen.getByText(`20,8 ${t("unit.celsius")}`)).toBeTruthy();
    expect(screen.getByText(`0 ${t("unit.millimeters")}`)).toBeTruthy();
    expect(screen.getByText(`3,6 ${t("unit.kmh")}`)).toBeTruthy();
    expect(screen.getByText(t("cardinal.S"))).toBeTruthy();
    expect(screen.getByText(`69 ${t("unit.percent")}`)).toBeTruthy();
    expect(screen.getByText(`1010,9 ${t("unit.hpa")}`)).toBeTruthy();
    expect(screen.getByText(`49,3 ${t("unit.kilometers")}`)).toBeTruthy();
    expect(screen.getByText(t("weather.temperature"))).toBeTruthy();
    expect(screen.getByText(t("weather.observedAt"))).toBeTruthy();
    expect(screen.getByText(formatObservedAt(weather.observedAt))).toBeTruthy();
  });

  it("el botón Actualizar emite la recarga", () => {
    const onRefresh = vi.fn();
    render(<CurrentWeatherCard city={cordoba} status="loaded" weather={weather} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: t("weather.refresh") }));

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("mientras carga muestra solo Cargando… y ningún valor de clima", () => {
    render(<CurrentWeatherCard city={cordoba} status="loading" weather={weather} onRefresh={() => undefined} />);

    expect(screen.getByText(t("weather.loading"))).toBeTruthy();
    expect(screen.queryByText(t("weather.temperature"))).toBeNull();
    expect(screen.queryByText(`20,8 ${t("unit.celsius")}`)).toBeNull();
    expect(screen.queryByRole("button", { name: t("weather.refresh") })).toBeNull();
  });

  it("un dato ausente se muestra como - y el cero como cero con su unidad", () => {
    const partial = { measurementSystem: "METRIC", observedAt: weather.observedAt, stale: false, windSpeed: 0, precipitation: 0 } as const;
    render(<CurrentWeatherCard city={cordoba} status="loaded" weather={partial} onRefresh={() => undefined} />);

    expect(screen.getByText(`0 ${t("unit.kmh")}`)).toBeTruthy();
    expect(screen.getByText(`0 ${t("unit.millimeters")}`)).toBeTruthy();
    // Temperatura, dirección, humedad, presión y visibilidad ausentes.
    expect(screen.getAllByText(t("weather.missing"))).toHaveLength(5);
  });

  it("sin observación los siete datos son - y no se muestra hora", () => {
    render(
      <CurrentWeatherCard
        city={cordoba}
        status="loaded"
        weather={{ measurementSystem: "METRIC", stale: false }}
        onRefresh={() => undefined}
      />,
    );

    expect(screen.getAllByText(t("weather.missing"))).toHaveLength(7);
    expect(screen.queryByText(t("weather.observedAt"))).toBeNull();
  });

  it("con stale muestra la advertencia junto a los datos y la hora; sin stale no", () => {
    const { rerender } = render(
      <CurrentWeatherCard city={cordoba} status="loaded" weather={{ ...weather, stale: true }} onRefresh={() => undefined} />,
    );
    expect(screen.getByText(t("weather.stale"))).toBeTruthy();
    expect(screen.getByText(`20,8 ${t("unit.celsius")}`)).toBeTruthy();
    expect(screen.getByText(t("weather.observedAt"))).toBeTruthy();

    rerender(<CurrentWeatherCard city={cordoba} status="loaded" weather={weather} onRefresh={() => undefined} />);
    expect(screen.queryByText(t("weather.stale"))).toBeNull();
  });

  it("con error muestra Error interno en lugar de los datos y permite reintentar", () => {
    const onRefresh = vi.fn();
    render(<CurrentWeatherCard city={cordoba} status="error" onRefresh={onRefresh} />);

    expect(screen.getByRole("alert").textContent).toBe(t("error.internal"));
    expect(screen.queryByText(t("weather.temperature"))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: t("weather.refresh") }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
