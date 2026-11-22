package ar.chiflete.weather.adapter.out.openmeteo;

import java.time.Instant;

import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import ar.chiflete.weather.application.port.out.WeatherProvider;
import ar.chiflete.weather.domain.WeatherObservation;

/**
 * Clima actual con la Forecast API de Open-Meteo (research R3). Las unidades por defecto del
 * proveedor ya son métricas; la hora llega en segundos UTC ({@code timeformat=unixtime}).
 */
public class OpenMeteoWeatherProvider implements WeatherProvider {

    static final String FORECAST_URI = "/v1/forecast?latitude={latitude}&longitude={longitude}"
            + "&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,"
            + "relative_humidity_2m,pressure_msl,visibility&timeformat=unixtime&timezone=GMT";

    private static final WeatherObservation NO_DATA =
            new WeatherObservation(null, null, null, null, null, null, null, null);

    private final RestClient client;

    public OpenMeteoWeatherProvider(RestClient client) {
        this.client = client;
    }

    @Override
    public WeatherObservation current(double latitude, double longitude) {
        ForecastResponse response = ProviderCalls.call(() -> client.get()
                .uri(FORECAST_URI, latitude, longitude)
                .retrieve()
                .body(ForecastResponse.class));
        if (response == null || response.current() == null) {
            return NO_DATA;
        }
        Current c = response.current();
        return new WeatherObservation(
                c.time() == null ? null : Instant.ofEpochSecond(c.time()),
                c.temperature(),
                c.precipitation(),
                c.windSpeed(),
                c.windDirection(),
                c.relativeHumidity(),
                c.pressure(),
                c.visibility());
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ForecastResponse(Current current) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Current(
            Long time,
            @JsonProperty("temperature_2m") Double temperature,
            Double precipitation,
            @JsonProperty("wind_speed_10m") Double windSpeed,
            @JsonProperty("wind_direction_10m") Integer windDirection,
            @JsonProperty("relative_humidity_2m") Integer relativeHumidity,
            @JsonProperty("pressure_msl") Double pressure,
            Double visibility) {
    }
}
