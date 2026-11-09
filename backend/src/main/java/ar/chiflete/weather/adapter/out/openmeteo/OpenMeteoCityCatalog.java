package ar.chiflete.weather.adapter.out.openmeteo;

import java.util.List;

import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import ar.chiflete.weather.application.port.out.CityCatalog;
import ar.chiflete.weather.domain.City;

/**
 * Búsqueda de ciudades con la Geocoding API de Open-Meteo (research R1). El texto va como variable
 * de la plantilla de URI: se codifica y no aparece en la etiqueta {@code uri} de las métricas.
 */
public class OpenMeteoCityCatalog implements CityCatalog {

    static final String SEARCH_URI = "/v1/search?name={name}&count={count}&language=es&format=json";

    private final RestClient client;

    public OpenMeteoCityCatalog(RestClient client) {
        this.client = client;
    }

    @Override
    public List<City> search(String text, int count) {
        SearchResponse response = client.get()
                .uri(SEARCH_URI, text, count)
                .retrieve()
                .body(SearchResponse.class);
        if (response == null || response.results() == null) {
            return List.of();
        }
        return response.results().stream()
                .map(r -> new City(r.id(), r.name(), r.admin1(), r.country(), r.latitude(), r.longitude()))
                .toList();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SearchResponse(List<Result> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Result(long id, String name, double latitude, double longitude, String admin1, String country) {
    }
}
