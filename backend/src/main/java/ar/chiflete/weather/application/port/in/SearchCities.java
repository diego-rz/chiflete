package ar.chiflete.weather.application.port.in;

import ar.chiflete.weather.domain.SearchPage;

/** Busca ciudades por el inicio de su nombre (FR-002 a FR-009). */
public interface SearchCities {

    /** @throws IllegalArgumentException si el texto, {@code offset} o {@code limit} no son válidos */
    SearchPage search(String text, int offset, int limit);
}
