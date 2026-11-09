package ar.chiflete.weather.domain;

import java.util.List;

/**
 * Página de resultados (research R2). El proveedor no pagina: se le piden
 * {@code offset + limit + 1} resultados y el elemento extra indica si hay más.
 */
public record SearchPage(List<City> items, boolean hasMore) {

    public static final int PROVIDER_MAX_RESULTS = 100;

    public SearchPage {
        items = List.copyOf(items);
    }

    public static int providerCount(int offset, int limit) {
        return Math.min(offset + limit + 1, PROVIDER_MAX_RESULTS);
    }

    public static SearchPage from(List<City> providerResults, int offset, int limit) {
        int end = offset + limit;
        List<City> items = offset >= providerResults.size()
                ? List.of()
                : providerResults.subList(offset, Math.min(end, providerResults.size()));
        boolean hasMore = providerResults.size() > end && end < PROVIDER_MAX_RESULTS;
        return new SearchPage(items, hasMore);
    }
}
