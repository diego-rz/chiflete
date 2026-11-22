package ar.chiflete.weather.application.port.out;

import ar.chiflete.weather.domain.WeatherObservation;

/** Proveedor del clima actual. */
public interface WeatherProvider {

    WeatherObservation current(double latitude, double longitude);
}
