package ar.chiflete.weather.adapter.in.web;

import static com.atlassian.oai.validator.mockmvc.OpenApiValidationMatchers.openApi;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.stream.LongStream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.in.SearchCities;
import ar.chiflete.weather.application.port.out.CityCatalog;
import ar.chiflete.weather.application.service.SearchCitiesService;
import ar.chiflete.weather.domain.City;

/**
 * El endpoint de búsqueda cumple contract/openapi.yaml (Principio II). Usa el caso de uso real
 * sobre un catálogo simulado, así que también se ejercitan la validación y la paginación.
 */
@WebMvcTest(CitiesController.class)
@Import(CitiesContractTest.Wiring.class)
class CitiesContractTest {

    static final String CONTRACT = "../contract/openapi.yaml";

    @TestConfiguration
    static class Wiring {
        @Bean
        SearchCities searchCities(CityCatalog catalog) {
            return new SearchCitiesService(catalog);
        }
    }

    @Autowired
    MockMvc mvc;

    @MockitoBean
    CityCatalog catalog;

    @MockitoBean
    GetCurrentWeather getCurrentWeather;

    private static List<City> cities(int n) {
        return LongStream.rangeClosed(1, n)
                .mapToObj(i -> new City(i, "San " + i, "Provincia " + i, "País", -30 - i / 100.0, -60 - i / 100.0))
                .toList();
    }

    @Test
    void searchReturnsAValidPageWithCoordinatesAndOmitsMissingFields() throws Exception {
        given(catalog.search("cordoba", 6)).willReturn(List.of(
                new City(3860259, "Córdoba", "Provincia de Córdoba", "Argentina", -31.4135, -64.18105),
                new City(4568127, "San Juan", "San Juan", null, 18.46633, -66.10572),
                new City(2993458, "Mónaco", null, "Mónaco", 43.73333, 7.41667)));

        mvc.perform(get("/api/v1/cities").param("query", "cordoba"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.hasMore").value(false))
                .andExpect(jsonPath("$.items[0].latitude").value(-31.4135))
                .andExpect(jsonPath("$.items[0].longitude").value(-64.18105))
                .andExpect(jsonPath("$.items[1].country").doesNotExist())
                .andExpect(jsonPath("$.items[2].province").doesNotExist());
    }

    @Test
    void firstPageHasAtMostFiveItems() throws Exception {
        given(catalog.search("san", 6)).willReturn(cities(6));

        mvc.perform(get("/api/v1/cities").param("query", "san"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.hasMore").value(true));
    }

    @Test
    void noResultsIsAnEmptyPage() throws Exception {
        given(catalog.search("xyzqwv", 6)).willReturn(List.of());

        mvc.perform(get("/api/v1/cities").param("query", "xyzqwv"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(content().json("{\"items\":[],\"hasMore\":false}", true));
    }

    @Test
    void secondPageReturnsResultsSixToTen() throws Exception {
        given(catalog.search("san", 11)).willReturn(cities(11));

        mvc.perform(get("/api/v1/cities").param("query", "san").param("offset", "5").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(jsonPath("$.items[*].id").value(org.hamcrest.Matchers.contains(6, 7, 8, 9, 10)))
                .andExpect(jsonPath("$.hasMore").value(true));
    }

    @Test
    void lastPageAllowedByTheProviderHasNoMore() throws Exception {
        given(catalog.search("san", 100)).willReturn(cities(100));

        mvc.perform(get("/api/v1/cities").param("query", "san").param("offset", "95").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(jsonPath("$.items.length()").value(5))
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void pageBeyondTheProviderLimitIsInvalid() throws Exception {
        mvc.perform(get("/api/v1/cities").param("query", "san").param("offset", "96").param("limit", "5"))
                .andExpect(status().isBadRequest())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
        verifyNoInteractions(catalog);
    }

    @Test
    void invalidRequestsReturnInvalidRequest() throws Exception {
        // Fuera del contrato (minLength 3, maximum 20): no se valida la petición, solo la respuesta.
        mvc.perform(get("/api/v1/cities").param("query", "san").param("limit", "21"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
        mvc.perform(get("/api/v1/cities").param("query", "co"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
        mvc.perform(get("/api/v1/cities").param("query", "san").param("offset", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
        verifyNoInteractions(catalog);
    }
}
