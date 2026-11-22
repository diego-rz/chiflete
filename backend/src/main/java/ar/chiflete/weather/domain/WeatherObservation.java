package ar.chiflete.weather.domain;

import java.time.Instant;

/**
 * Datos actuales tal como los entrega el proveedor (research R3). Cualquier campo puede ser
 * {@code null} si el proveedor no lo informa. La visibilidad viene en metros.
 */
public record WeatherObservation(
        Instant time,
        Double temperatureCelsius,
        Double precipitationMillimeters,
        Double windSpeedKmh,
        Integer windDirectionDegrees,
        Integer relativeHumidityPercent,
        Double pressureHpa,
        Double visibilityMeters) {
}
