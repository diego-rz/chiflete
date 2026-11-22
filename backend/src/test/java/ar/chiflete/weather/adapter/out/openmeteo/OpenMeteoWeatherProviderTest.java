package ar.chiflete.weather.adapter.out.openmeteo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import ar.chiflete.weather.domain.WeatherObservation;

class OpenMeteoWeatherProviderTest {

    private static final String BASE = "https://forecast.test";
    private static final String EXPECTED_URL = BASE + "/v1/forecast?latitude=-31.4135&longitude=-64.18105"
            + "&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,"
            + "relative_humidity_2m,pressure_msl,visibility&timeformat=unixtime&timezone=GMT";

    private MockRestServiceServer server;
    private OpenMeteoWeatherProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new OpenMeteoWeatherProvider(builder.build());
    }

    @Test
    void requestsTheSevenCurrentVariablesInUnixTimeAndMapsThem() {
        server.expect(requestTo(EXPECTED_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(Fixtures.read("forecast-cordoba.json"), MediaType.APPLICATION_JSON));

        WeatherObservation observation = provider.current(-31.4135, -64.18105);

        server.verify();
        assertThat(observation).isEqualTo(new WeatherObservation(
                Instant.ofEpochSecond(1794240000L), 24.5, 0.0, 20.7, 27, 36, 1019.2, 62460.0));
    }

    @Test
    void missingVariablesStayNull() {
        server.expect(requestTo(EXPECTED_URL))
                .andRespond(withSuccess(Fixtures.read("forecast-partial.json"), MediaType.APPLICATION_JSON));

        WeatherObservation observation = provider.current(-31.4135, -64.18105);

        assertThat(observation.visibilityMeters()).isNull();
        assertThat(observation.windDirectionDegrees()).isNull();
        assertThat(observation.temperatureCelsius()).isEqualTo(24.5);
        assertThat(observation.precipitationMillimeters()).isEqualTo(0.0);
    }

    @Test
    void missingCurrentBlockMeansNoData() {
        server.expect(requestTo(EXPECTED_URL))
                .andRespond(withSuccess("{\"latitude\":-31.4,\"longitude\":-64.2}", MediaType.APPLICATION_JSON));

        WeatherObservation observation = provider.current(-31.4135, -64.18105);

        assertThat(observation).isEqualTo(new WeatherObservation(null, null, null, null, null, null, null, null));
    }
}
