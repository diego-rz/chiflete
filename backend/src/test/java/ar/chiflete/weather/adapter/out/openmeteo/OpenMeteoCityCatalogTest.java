package ar.chiflete.weather.adapter.out.openmeteo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import ar.chiflete.weather.domain.City;

class OpenMeteoCityCatalogTest {

    private static final String BASE = "https://geocoding.test";

    private MockRestServiceServer server;
    private OpenMeteoCityCatalog catalog;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        catalog = new OpenMeteoCityCatalog(builder.build());
    }

    @Test
    void searchesByNameInSpanishAndMapsTheResults() {
        server.expect(requestTo(BASE + "/v1/search?name=cordoba&count=6&language=es&format=json"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(Fixtures.read("search-cordoba.json"), MediaType.APPLICATION_JSON));

        List<City> cities = catalog.search("cordoba", 6);

        server.verify();
        assertThat(cities).isNotEmpty();
        assertThat(cities.getFirst()).isEqualTo(
                new City(3860259, "Córdoba", "Provincia de Córdoba", "Argentina", -31.40648, -64.18853));
        assertThat(cities.get(1).country()).isEqualTo("España");
    }

    @Test
    void encodesTheTextInTheUrl() {
        server.expect(requestTo(BASE + "/v1/search?name=%C3%B1and%C3%BA%20sur&count=6&language=es&format=json"))
                .andRespond(withSuccess(Fixtures.read("search-empty.json"), MediaType.APPLICATION_JSON));

        catalog.search("ñandú sur", 6);

        server.verify();
    }

    @Test
    void noResultsFieldMeansNoCities() {
        server.expect(requestTo(BASE + "/v1/search?name=xyzqwv&count=6&language=es&format=json"))
                .andRespond(withSuccess(Fixtures.read("search-empty.json"), MediaType.APPLICATION_JSON));

        assertThat(catalog.search("xyzqwv", 6)).isEmpty();
    }

    @Test
    void toleratesMissingCountry() {
        server.expect(requestTo(BASE + "/v1/search?name=san%20juan&count=6&language=es&format=json"))
                .andRespond(withSuccess(Fixtures.read("search-no-country.json"), MediaType.APPLICATION_JSON));

        City city = catalog.search("san juan", 6).getFirst();

        assertThat(city.name()).isEqualTo("San Juan");
        assertThat(city.province()).isEqualTo("San Juan");
        assertThat(city.country()).isNull();
    }

    @Test
    void toleratesMissingProvince() {
        server.expect(requestTo(BASE + "/v1/search?name=mon&count=6&language=es&format=json"))
                .andRespond(withSuccess("""
                        {"results":[{"id":2993458,"name":"Mónaco","latitude":43.73333,"longitude":7.41667,"country":"Mónaco"}]}
                        """, MediaType.APPLICATION_JSON));

        City city = catalog.search("mon", 6).getFirst();

        assertThat(city.province()).isNull();
        assertThat(city.country()).isEqualTo("Mónaco");
    }
}
