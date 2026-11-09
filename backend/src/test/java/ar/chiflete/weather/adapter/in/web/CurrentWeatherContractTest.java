package ar.chiflete.weather.adapter.in.web;

import static com.atlassian.oai.validator.mockmvc.OpenApiValidationMatchers.openApi;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.in.SearchCities;
import ar.chiflete.weather.domain.CurrentWeather;
import ar.chiflete.weather.domain.MeasurementSystem;

/** El endpoint de clima cumple contract/openapi.yaml (Principio II). */
@WebMvcTest(CitiesController.class)
class CurrentWeatherContractTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    SearchCities searchCities;

    @MockitoBean
    GetCurrentWeather getCurrentWeather;

    @Test
    void completeWeatherIsValid() throws Exception {
        given(getCurrentWeather.current(-31.4135, -64.18105)).willReturn(new CurrentWeather(
                MeasurementSystem.METRIC, Optional.of(Instant.parse("2026-11-01T02:00:00Z")), false,
                Optional.of(20.8), Optional.of(0.0), Optional.of(3.6), Optional.of(198), Optional.of(69),
                Optional.of(1010.9), Optional.of(49.26)));

        mvc.perform(get("/api/v1/current-weather").param("latitude", "-31.4135").param("longitude", "-64.18105"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CitiesContractTest.CONTRACT))
                .andExpect(content().json("""
                        {"measurementSystem":"METRIC","observedAt":"2026-11-01T02:00:00Z","stale":false,
                         "temperature":20.8,"precipitation":0.0,"windSpeed":3.6,"windDirection":198,
                         "relativeHumidity":69,"pressure":1010.9,"visibility":49.26}
                        """, true));
    }

    @Test
    void missingValuesAreOmittedNotNull() throws Exception {
        given(getCurrentWeather.current(anyDouble(), anyDouble())).willReturn(new CurrentWeather(
                MeasurementSystem.METRIC, Optional.empty(), false, Optional.empty(), Optional.empty(),
                Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty()));

        mvc.perform(get("/api/v1/current-weather").param("latitude", "0").param("longitude", "0"))
                .andExpect(status().isOk())
                .andExpect(openApi().isValid(CitiesContractTest.CONTRACT))
                .andExpect(content().json("{\"measurementSystem\":\"METRIC\",\"stale\":false}", true))
                .andExpect(jsonPath("$.observedAt").doesNotExist());
    }

    @Test
    void outOfRangeLatitudeReturnsInvalidRequest() throws Exception {
        given(getCurrentWeather.current(91, 0)).willThrow(new IllegalArgumentException("out of range"));

        mvc.perform(get("/api/v1/current-weather").param("latitude", "91").param("longitude", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
    }

    @Test
    void missingLongitudeReturnsInvalidRequest() throws Exception {
        mvc.perform(get("/api/v1/current-weather").param("latitude", "-31.4135"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
    }
}
