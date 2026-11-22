package ar.chiflete.weather.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;

class CurrentWeatherTest {

    private static final Instant NOW = Instant.parse("2026-11-01T12:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private static WeatherObservation observedAt(Instant time) {
        return new WeatherObservation(time, 20.8, 0.0, 3.6, 198, 69, 1010.9, 49260.0);
    }

    @Test
    void mapsAllValuesAndConvertsVisibilityFromMetersToKilometers() {
        CurrentWeather weather = CurrentWeather.from(observedAt(NOW.minusSeconds(900)), CLOCK);

        assertThat(weather.measurementSystem()).isEqualTo(MeasurementSystem.METRIC);
        assertThat(weather.observedAt()).contains(NOW.minusSeconds(900));
        assertThat(weather.temperature()).contains(20.8);
        assertThat(weather.windSpeed()).contains(3.6);
        assertThat(weather.windDirection()).contains(198);
        assertThat(weather.relativeHumidity()).contains(69);
        assertThat(weather.pressure()).contains(1010.9);
        assertThat(weather.visibility()).contains(49.26);
    }

    @Test
    void zeroIsKeptAndMissingValuesStayEmpty() {
        WeatherObservation observation = new WeatherObservation(NOW, 0.0, 0.0, 0.0, null, null, null, 0.0);

        CurrentWeather weather = CurrentWeather.from(observation, CLOCK);

        assertThat(weather.temperature()).contains(0.0);
        assertThat(weather.precipitation()).contains(0.0);
        assertThat(weather.windSpeed()).contains(0.0);
        assertThat(weather.visibility()).contains(0.0);
        assertThat(weather.windDirection()).isEmpty();
        assertThat(weather.relativeHumidity()).isEmpty();
        assertThat(weather.pressure()).isEmpty();
    }

    @Test
    void staleOnlyWhenOlderThanTwoHours() {
        Duration twoHours = Duration.ofHours(2);

        assertThat(CurrentWeather.from(observedAt(NOW.minus(twoHours)), CLOCK).stale()).isFalse();
        assertThat(CurrentWeather.from(observedAt(NOW.minus(twoHours).minusSeconds(1)), CLOCK).stale()).isTrue();
        assertThat(CurrentWeather.from(observedAt(NOW), CLOCK).stale()).isFalse();
    }

    @Test
    void withoutObservationTimeItIsNotStaleAndHasNoTime() {
        WeatherObservation observation = new WeatherObservation(null, null, null, null, null, null, null, null);

        CurrentWeather weather = CurrentWeather.from(observation, CLOCK);

        assertThat(weather.observedAt()).isEqualTo(Optional.empty());
        assertThat(weather.stale()).isFalse();
        assertThat(weather.temperature()).isEmpty();
        assertThat(weather.visibility()).isEmpty();
    }
}
