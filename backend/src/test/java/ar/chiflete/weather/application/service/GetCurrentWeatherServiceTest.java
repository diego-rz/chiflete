package ar.chiflete.weather.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import ar.chiflete.weather.application.port.out.ProviderTimeoutException;
import ar.chiflete.weather.application.port.out.ProviderUnavailableException;
import ar.chiflete.weather.application.port.out.WeatherProvider;
import ar.chiflete.weather.domain.CurrentWeather;
import ar.chiflete.weather.domain.WeatherObservation;

class GetCurrentWeatherServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-01T12:00:00Z");

    private final FakeProvider provider = new FakeProvider();
    private final GetCurrentWeatherService service =
            new GetCurrentWeatherService(provider, Clock.fixed(NOW, ZoneOffset.UTC));
    private final LogCapture logs = new LogCapture(GetCurrentWeatherService.class);

    @AfterEach
    void detach() {
        logs.close();
    }

    @Test
    void asksTheProviderOnceWithTheGivenCoordinatesAndBuildsTheWeather() {
        CurrentWeather weather = service.current(-31.4135, -64.18105);

        assertThat(provider.requests).containsExactly("-31.4135|-64.18105");
        assertThat(weather.temperature()).contains(20.8);
        assertThat(weather.visibility()).contains(49.26);
        assertThat(weather.stale()).isFalse();
    }

    @Test
    void logsSuccessWithCoordinatesAndDuration() {
        service.current(-31.4135, -64.18105);

        assertThat(logs.events()).hasSize(1);
        Map<String, Object> entry = LogCapture.keyValues(logs.events().getFirst());
        assertThat(entry).containsEntry("operation", "CURRENT_WEATHER")
                .containsEntry("outcome", "SUCCESS")
                .containsEntry("latitude", -31.4135)
                .containsEntry("longitude", -64.18105)
                .containsKey("durationMs");
    }

    @Test
    void rejectsCoordinatesOutOfRangeWithoutCallingTheProvider() {
        assertThatIllegalArgumentException().isThrownBy(() -> service.current(91, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> service.current(-91, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> service.current(0, 181));
        assertThatIllegalArgumentException().isThrownBy(() -> service.current(0, -181));
        assertThatIllegalArgumentException().isThrownBy(() -> service.current(Double.NaN, 0));
        assertThat(provider.requests).isEmpty();
    }

    @Test
    void providerFailuresAreLoggedAndPropagated() {
        provider.failure = new ProviderUnavailableException();
        assertThatThrownBy(() -> service.current(-31.4135, -64.18105)).isInstanceOf(ProviderUnavailableException.class);

        provider.failure = new ProviderTimeoutException();
        assertThatThrownBy(() -> service.current(-31.4135, -64.18105)).isInstanceOf(ProviderTimeoutException.class);

        assertThat(LogCapture.keyValues(logs.events().get(0)))
                .containsEntry("operation", "CURRENT_WEATHER").containsEntry("outcome", "PROVIDER_ERROR")
                .containsEntry("latitude", -31.4135).containsKey("durationMs");
        assertThat(LogCapture.keyValues(logs.events().get(1))).containsEntry("outcome", "TIMEOUT");
    }

    static final class FakeProvider implements WeatherProvider {
        final List<String> requests = new ArrayList<>();
        RuntimeException failure;

        @Override
        public WeatherObservation current(double latitude, double longitude) {
            requests.add(latitude + "|" + longitude);
            if (failure != null) {
                throw failure;
            }
            return new WeatherObservation(NOW.minusSeconds(900), 20.8, 0.0, 3.6, 198, 69, 1010.9, 49260.0);
        }
    }
}
