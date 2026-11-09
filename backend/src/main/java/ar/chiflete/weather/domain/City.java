package ar.chiflete.weather.domain;

import java.util.Objects;

/**
 * Ciudad devuelta por la búsqueda (data-model.md). {@code province} y {@code country} pueden ser
 * {@code null} cuando el proveedor no los informa.
 */
public record City(
        long id,
        String name,
        String province,
        String country,
        double latitude,
        double longitude) {

    public City {
        Objects.requireNonNull(name, "name");
    }
}
