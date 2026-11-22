package ar.chiflete.weather.adapter.out.openmeteo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.function.Consumer;
import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.RestClient;

import ar.chiflete.weather.application.port.out.ProviderTimeoutException;
import ar.chiflete.weather.application.port.out.ProviderUnavailableException;

/**
 * Los fallos de Open-Meteo se traducen a excepciones de puerto sin detalles del proveedor ni de
 * la petición (FR-022a, FR-023, Principio V). Cubre los dos adaptadores.
 */
class ProviderFailuresTest {

    private static final String REASON = "Latitude must be in range of -90 to 90°. Given: 999.0.";

    static Stream<Arguments> failures() {
        return Stream.of(
                Arguments.of("5xx", withServerError(), ProviderUnavailableException.class),
                Arguments.of("400 con reason", withBadRequest()
                        .body(Fixtures.read("error-400.json")).contentType(MediaType.APPLICATION_JSON),
                        ProviderUnavailableException.class),
                Arguments.of("conexión rechazada", withException(new ConnectException("refused")),
                        ProviderUnavailableException.class),
                Arguments.of("JSON inválido", withSuccess("{not json", MediaType.APPLICATION_JSON),
                        ProviderUnavailableException.class),
                Arguments.of("lectura agotada (socket)", withException(new SocketTimeoutException("Read timed out")),
                        ProviderTimeoutException.class),
                Arguments.of("lectura agotada (cliente JDK)", withException(new HttpTimeoutException("request timed out")),
                        ProviderTimeoutException.class),
                Arguments.of("conexión agotada (cliente JDK)",
                        withException(new HttpConnectTimeoutException("connect timed out")),
                        ProviderTimeoutException.class));
    }

    @ParameterizedTest(name = "búsqueda: {0}")
    @MethodSource("failures")
    void cityCatalogTranslatesFailures(String name, ResponseCreator response, Class<? extends Throwable> expected) {
        assertTranslated(response, expected, client -> new OpenMeteoCityCatalog(client).search("cordoba", 6));
    }

    @ParameterizedTest(name = "clima: {0}")
    @MethodSource("failures")
    void weatherProviderTranslatesFailures(String name, ResponseCreator response, Class<? extends Throwable> expected) {
        assertTranslated(response, expected, client -> new OpenMeteoWeatherProvider(client).current(999, 0));
    }

    private static void assertTranslated(ResponseCreator response, Class<? extends Throwable> expected,
            Consumer<RestClient> call) {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://provider.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(anything()).andRespond(response);

        Throwable thrown = catchThrowable(() -> call.accept(builder.build()));

        assertThat(thrown).isExactlyInstanceOf(expected);
        assertThat(thrown.getMessage()).isNull();
        assertThat(thrown.getCause()).isNull();
        assertThat(thrown.toString()).doesNotContain(REASON).doesNotContain("cordoba");
    }
}
