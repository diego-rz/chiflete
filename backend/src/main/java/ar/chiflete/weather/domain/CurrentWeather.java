package ar.chiflete.weather.domain;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Clima actual que entrega el sistema (data-model.md, CurrentWeather). Los datos ausentes quedan
 * vacíos, nunca en cero (FR-018). Está desactualizado si tiene más de 2 horas (FR-015).
 */
public record CurrentWeather(
        MeasurementSystem measurementSystem,
        Optional<Instant> observedAt,
        boolean stale,
        Optional<Double> temperature,
        Optional<Double> precipitation,
        Optional<Double> windSpeed,
        Optional<Integer> windDirection,
        Optional<Integer> relativeHumidity,
        Optional<Double> pressure,
        Optional<Double> visibility) {

    public static final Duration MAX_AGE = Duration.ofHours(2);

    private static final double METERS_PER_KILOMETER = 1000.0;

    public static CurrentWeather from(WeatherObservation observation, Clock clock) {
        Optional<Instant> observedAt = Optional.ofNullable(observation.time());
        boolean stale = observedAt
                .map(time -> Duration.between(time, clock.instant()).compareTo(MAX_AGE) > 0)
                .orElse(false);
        return new CurrentWeather(
                MeasurementSystem.METRIC,
                observedAt,
                stale,
                Optional.ofNullable(observation.temperatureCelsius()),
                Optional.ofNullable(observation.precipitationMillimeters()),
                Optional.ofNullable(observation.windSpeedKmh()),
                Optional.ofNullable(observation.windDirectionDegrees()),
                Optional.ofNullable(observation.relativeHumidityPercent()),
                Optional.ofNullable(observation.pressureHpa()),
                // Cambio de escala dentro del sistema métrico, no una conversión (Principio IX).
                Optional.ofNullable(observation.visibilityMeters()).map(m -> m / METERS_PER_KILOMETER));
    }
}
