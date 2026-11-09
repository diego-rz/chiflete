package ar.chiflete.weather.application.service;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.out.WeatherProvider;
import ar.chiflete.weather.domain.CurrentWeather;

/**
 * Caso de uso del clima actual: una sola llamada al proveedor con las coordenadas de la ciudad.
 * Registra cada petición con las coordenadas, el resultado y la duración (FR-028a).
 */
public class GetCurrentWeatherService implements GetCurrentWeather {

    private static final Logger log = LoggerFactory.getLogger(GetCurrentWeatherService.class);

    private final WeatherProvider provider;
    private final Clock clock;

    public GetCurrentWeatherService(WeatherProvider provider, Clock clock) {
        this.provider = provider;
        this.clock = clock;
    }

    @Override
    public CurrentWeather current(double latitude, double longitude) {
        if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180)) {
            throw new IllegalArgumentException("coordinates out of range");
        }
        long started = System.nanoTime();
        CurrentWeather weather = CurrentWeather.from(provider.current(latitude, longitude), clock);
        log.atInfo()
                .addKeyValue("operation", "CURRENT_WEATHER")
                .addKeyValue("outcome", "SUCCESS")
                .addKeyValue("latitude", latitude)
                .addKeyValue("longitude", longitude)
                .addKeyValue("durationMs", SearchCitiesService.elapsedMillis(started))
                .log("Operation completed");
        return weather;
    }
}
