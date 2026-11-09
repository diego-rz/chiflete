package ar.chiflete.weather.adapter.in.web;

import java.time.ZoneOffset;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import ar.chiflete.weather.adapter.in.web.api.CitiesApi;
import ar.chiflete.weather.adapter.in.web.api.WeatherApi;
import ar.chiflete.weather.adapter.in.web.model.City;
import ar.chiflete.weather.adapter.in.web.model.CitySearchPage;
import ar.chiflete.weather.adapter.in.web.model.CurrentWeather;
import ar.chiflete.weather.adapter.in.web.model.MeasurementSystem;
import ar.chiflete.weather.application.port.in.GetCurrentWeather;
import ar.chiflete.weather.application.port.in.SearchCities;
import ar.chiflete.weather.domain.SearchPage;

/**
 * Implementa las interfaces generadas desde contract/openapi.yaml (Principio I) y traduce el
 * dominio a los modelos del contrato. Los datos ausentes quedan en {@code null} y Jackson los
 * omite ({@code spring.jackson.default-property-inclusion=non_null}).
 */
@RestController
public class CitiesController implements CitiesApi, WeatherApi {

    private final SearchCities searchCities;
    private final GetCurrentWeather getCurrentWeather;

    public CitiesController(SearchCities searchCities, GetCurrentWeather getCurrentWeather) {
        this.searchCities = searchCities;
        this.getCurrentWeather = getCurrentWeather;
    }

    @Override
    public ResponseEntity<CitySearchPage> searchCities(String query, Integer offset, Integer limit) {
        SearchPage page = searchCities.search(query, offset, limit);
        CitySearchPage body = new CitySearchPage(page.items().stream().map(CitiesController::toModel).toList(),
                page.hasMore());
        return ResponseEntity.ok(body);
    }

    @Override
    public ResponseEntity<CurrentWeather> getCurrentWeather(Double latitude, Double longitude) {
        ar.chiflete.weather.domain.CurrentWeather weather = getCurrentWeather.current(latitude, longitude);
        CurrentWeather body = new CurrentWeather(MeasurementSystem.fromValue(weather.measurementSystem().name()),
                weather.stale());
        body.setObservedAt(weather.observedAt().map(t -> t.atOffset(ZoneOffset.UTC)).orElse(null));
        body.setTemperature(weather.temperature().orElse(null));
        body.setPrecipitation(weather.precipitation().orElse(null));
        body.setWindSpeed(weather.windSpeed().orElse(null));
        body.setWindDirection(weather.windDirection().orElse(null));
        body.setRelativeHumidity(weather.relativeHumidity().orElse(null));
        body.setPressure(weather.pressure().orElse(null));
        body.setVisibility(weather.visibility().orElse(null));
        return ResponseEntity.ok(body);
    }

    private static City toModel(ar.chiflete.weather.domain.City city) {
        City model = new City(city.id(), city.name(), city.latitude(), city.longitude());
        model.setProvince(city.province());
        model.setCountry(city.country());
        return model;
    }
}
