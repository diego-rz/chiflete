package ar.chiflete.weather.domain;

/**
 * Búsqueda validada (data-model.md, CitySearch). El texto se recorta y debe tener entre 3 y 100
 * caracteres (FR-002). El proveedor devuelve como mucho {@value SearchPage#PROVIDER_MAX_RESULTS}
 * resultados, así que {@code offset + limit} no puede superarlo.
 */
public record CitySearchQuery(String text, int offset, int limit) {

    public static final int MIN_LENGTH = 3;
    public static final int MAX_LENGTH = 100;
    public static final int MAX_LIMIT = 20;

    public static CitySearchQuery of(String rawText, int offset, int limit) {
        String text = rawText == null ? "" : rawText.strip();
        if (text.length() < MIN_LENGTH || text.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("query length out of range");
        }
        if (offset < 0 || limit < 1 || limit > MAX_LIMIT || offset + limit > SearchPage.PROVIDER_MAX_RESULTS) {
            throw new IllegalArgumentException("offset or limit out of range");
        }
        return new CitySearchQuery(text, offset, limit);
    }

    /** Resultados que hay que pedir al proveedor para servir esta página y saber si hay más. */
    public int providerCount() {
        return SearchPage.providerCount(offset, limit);
    }
}
