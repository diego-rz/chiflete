package ar.chiflete.weather.application.port.out;

/**
 * El proveedor de datos no está disponible o respondió con error. No lleva mensaje ni causa: los
 * del cliente HTTP incluyen la URL (con el texto buscado) y el motivo del proveedor (FR-023,
 * Principio V).
 */
public class ProviderUnavailableException extends RuntimeException {

    public ProviderUnavailableException() {
        super(null, null, false, false);
    }
}
