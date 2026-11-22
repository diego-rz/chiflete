package ar.chiflete.weather.application.service;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.out.WeatherProvider;
import ar.chiflete.weather.domain.CurrentWeather;
import ar.chiflete.weather.domain.WeatherObservation;

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
        OperationLog operation = OperationLog.start(log, "CURRENT_WEATHER")
                .with("latitude", latitude)
                .with("longitude", longitude);
        WeatherObservation observation = operation.run(() -> provider.current(latitude, longitude));
        operation.finish("SUCCESS");
        return CurrentWeather.from(observation, clock);
    }
}
