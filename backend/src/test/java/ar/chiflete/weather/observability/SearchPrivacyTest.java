package ar.chiflete.weather.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.sun.net.httpserver.HttpServer;

import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;

/**
 * Ni el texto buscado ni la IP del usuario aparecen en logs ni métricas (FR-028b, Principio V).
 * El proveedor se simula con el HttpServer del JDK, así que se ejercita el cliente HTTP real.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class SearchPrivacyTest {

    private static final String SEARCH_TEXT = "cordoba";
    private static final String USER_IP = "203.0.113.7";

    private static HttpServer provider;

    @Autowired
    MockMvc mvc;

    @Autowired
    MeterRegistry registry;

    @BeforeAll
    static void startProvider() throws IOException {
        byte[] body = fixture("search-cordoba.json");
        provider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        provider.createContext("/v1/search", exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        provider.start();
    }

    @AfterAll
    static void stopProvider() {
        provider.stop(0);
    }

    @DynamicPropertySource
    static void providerUrls(DynamicPropertyRegistry properties) {
        String url = "http://127.0.0.1:" + provider.getAddress().getPort();
        properties.add("chiflete.open-meteo.geocoding-url", () -> url);
        properties.add("chiflete.open-meteo.forecast-url", () -> url);
    }

    @Test
    void searchTextAndIpNeverReachLogsOrMetrics(CapturedOutput output) throws Exception {
        mvc.perform(get("/api/v1/cities").param("query", SEARCH_TEXT).header("X-Forwarded-For", USER_IP))
                .andExpect(status().isOk());

        assertThat(output.getAll()).contains("\"operation\":\"SEARCH\"")
                .doesNotContainIgnoringCase(SEARCH_TEXT)
                .doesNotContain(USER_IP);

        Collection<Meter> server = registry.find("http.server.requests").meters();
        Collection<Meter> client = registry.find("http.client.requests").meters();
        assertThat(server).isNotEmpty();
        assertThat(client).isNotEmpty();
        assertThat(tagValues(server)).contains("/api/v1/cities")
                .noneMatch(v -> v.toLowerCase().contains(SEARCH_TEXT) || v.contains(USER_IP));
        assertThat(tagValues(client)).contains("/v1/search?name={name}&count={count}&language=es&format=json")
                .noneMatch(v -> v.toLowerCase().contains(SEARCH_TEXT) || v.contains(USER_IP));
    }

    private static List<String> tagValues(Collection<Meter> meters) {
        return meters.stream().flatMap(m -> m.getId().getTags().stream()).map(Tag::getValue).toList();
    }

    private static byte[] fixture(String name) throws IOException {
        try (InputStream in = SearchPrivacyTest.class.getResourceAsStream("/openmeteo/" + name)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8).getBytes(StandardCharsets.UTF_8);
        }
    }
}
