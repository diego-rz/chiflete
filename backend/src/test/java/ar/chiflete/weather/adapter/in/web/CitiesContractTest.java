package ar.chiflete.weather.adapter.in.web;

import static com.atlassian.oai.validator.mockmvc.OpenApiValidationMatchers.openApi;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.in.SearchCities;
import ar.chiflete.weather.domain.City;
import ar.chiflete.weather.domain.SearchPage;

/** El endpoint de búsqueda cumple contract/openapi.yaml (Principio II). */
@WebMvcTest(CitiesController.class)
class CitiesContractTest {

    static final String CONTRACT = "../contract/openapi.yaml";

    @Autowired
    MockMvc mvc;

    @MockitoBean
    SearchCities searchCities;

    @MockitoBean
    GetCurrentWeather getCurrentWeather;

    @Test
    void searchReturnsAValidPageWithCoordinatesAndOmitsMissingFields() throws Exception {
        given(searchCities.search("cordoba", 0, 5)).willReturn(new SearchPage(List.of(
                new City(3860259, "Córdoba", "Provincia de Córdoba", "Argentina", -31.4135, -64.18105),
                new City(4568127, "San Juan", "San Juan", null, 18.46633, -66.10572),
                new City(2993458, "Mónaco", null, "Mónaco", 43.73333, 7.41667)), true));

        mvc.perform(get("/api/v1/cities").param("query", "cordoba"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.items[0].latitude").value(-31.4135))
                .andExpect(jsonPath("$.items[0].longitude").value(-64.18105))
                .andExpect(jsonPath("$.items[1].country").doesNotExist())
                .andExpect(jsonPath("$.items[2].province").doesNotExist());
    }

    @Test
    void searchUsesTheDefaultPageOfFive() throws Exception {
        given(searchCities.search("cordoba", 0, 5)).willReturn(new SearchPage(List.of(), false));

        mvc.perform(get("/api/v1/cities").param("query", "cordoba"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CONTRACT))
                .andExpect(content().json("{\"items\":[],\"hasMore\":false}", true));
    }

    @Test
    void invalidSearchReturnsInvalidRequest() throws Exception {
        given(searchCities.search("co", 0, 5)).willThrow(new IllegalArgumentException("too short"));

        mvc.perform(get("/api/v1/cities").param("query", "co"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
    }
}
