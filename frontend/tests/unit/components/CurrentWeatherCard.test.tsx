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
});
