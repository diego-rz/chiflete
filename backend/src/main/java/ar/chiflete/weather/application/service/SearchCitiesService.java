package ar.chiflete.weather.application.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ar.chiflete.weather.application.port.in.SearchCities;
import ar.chiflete.weather.application.port.out.CityCatalog;
import ar.chiflete.weather.domain.City;
import ar.chiflete.weather.domain.CitySearchQuery;
import ar.chiflete.weather.domain.SearchPage;

/**
 * Caso de uso de búsqueda. Registra cada petición con su {@code offset}, resultado y duración,
 * nunca con el texto buscado (FR-028a, FR-028b).
 */
public class SearchCitiesService implements SearchCities {

    private static final Logger log = LoggerFactory.getLogger(SearchCitiesService.class);

    private final CityCatalog catalog;

    public SearchCitiesService(CityCatalog catalog) {
        this.catalog = catalog;
    }

    @Override
    public SearchPage search(String text, int offset, int limit) {
        CitySearchQuery query = CitySearchQuery.of(text, offset, limit);
        OperationLog operation = OperationLog.start(log, "SEARCH").with("offset", query.offset());
        List<City> results = operation.run(() -> catalog.search(query.text(), query.providerCount()));
        SearchPage page = SearchPage.from(results, query.offset(), query.limit());
        operation.finish(page.items().isEmpty() ? "NO_RESULTS" : "SUCCESS");
        return page;
    }
}
