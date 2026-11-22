package ar.chiflete.weather.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.util.Collection;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.sun.net.httpserver.HttpServer;

import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.Timer;

/**
 * Métricas por endpoint para comprobar volumen, latencia y tasa de error (FR-028c, SC-002,
 * SC-003), sin el texto buscado ni IPs en ninguna etiqueta (FR-028b).
 */
@SpringBootTest
@AutoConfigureMockMvc
class MetricsTest {

    private static final String SEARCH_TEXT = "cordoba";
    private static final String USER_IP = "203.0.113.7";

    private static HttpServer provider;

    @Autowired
    MockMvc mvc;

    @Autowired
    MeterRegistry registry;

    @BeforeAll
    static void startProvider() throws IOException {
        provider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        serve("/v1/search", "search-cordoba.json");
        serve("/v1/forecast", "forecast-cordoba.json");
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
    void eachEndpointHasItsOwnTimerWithStatusAndLatency() throws Exception {
        mvc.perform(get("/api/v1/cities").param("query", SEARCH_TEXT).header("X-Forwarded-For", USER_IP))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/current-weather").param("latitude", "-31.4135").param("longitude", "-64.18105")
                .header("X-Forwarded-For", USER_IP))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/cities").param("query", "co"))
                .andExpect(status().isBadRequest());

        Timer search = registry.find("http.server.requests").tag("uri", "/api/v1/cities").tag("status", "200").timer();
        Timer weather = registry.find("http.server.requests").tag("uri", "/api/v1/current-weather").tag("status", "200")
                .timer();
        Timer invalid = registry.find("http.server.requests").tag("uri", "/api/v1/cities").tag("status", "400").timer();
        assertThat(search).isNotNull();
        assertThat(weather).isNotNull();
        assertThat(invalid).isNotNull();
        assertThat(search.count()).isGreaterThanOrEqualTo(1);
        assertThat(search.totalTime(TimeUnit.NANOSECONDS)).isPositive();
        assertThat(weather.count()).isGreaterThanOrEqualTo(1);
        assertThat(weather.totalTime(TimeUnit.NANOSECONDS)).isPositive();

        Collection<Meter> client = registry.find("http.client.requests").meters();
        assertThat(client).isNotEmpty();

        Collection<Meter> all = registry.getMeters();
        assertThat(all.stream().flatMap(m -> m.getId().getTags().stream()).map(Tag::getValue))
                .noneMatch(v -> v.toLowerCase().contains(SEARCH_TEXT) || v.contains(USER_IP));
    }

    private static void serve(String path, String fixture) throws IOException {
        byte[] body;
        try (InputStream in = MetricsTest.class.getResourceAsStream("/openmeteo/" + fixture)) {
            body = in.readAllBytes();
        }
        provider.createContext(path, exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
    }
}
