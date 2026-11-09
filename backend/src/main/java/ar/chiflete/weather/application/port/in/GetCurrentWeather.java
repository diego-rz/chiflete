package ar.chiflete.weather.application.port.in;

import ar.chiflete.weather.domain.CurrentWeather;

/** Clima actual en las coordenadas de una ciudad (FR-012 a FR-018). */
public interface GetCurrentWeather {

    /** @throws IllegalArgumentException si las coordenadas están fuera de rango */
    CurrentWeather current(double latitude, double longitude);
}
