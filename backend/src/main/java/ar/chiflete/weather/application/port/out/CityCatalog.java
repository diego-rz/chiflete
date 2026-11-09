package ar.chiflete.weather.application.port.out;

import java.util.List;

import ar.chiflete.weather.domain.City;

/** Proveedor de ciudades. */
public interface CityCatalog {

    /** Hasta {@code count} ciudades cuyo nombre empieza por {@code text}, en el orden del proveedor. */
    List<City> search(String text, int count);
}
