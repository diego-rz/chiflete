package ar.chiflete.weather.application.port.out;

/**
 * El proveedor de datos no está disponible o respondió con error. No lleva el mensaje del
 * proveedor, para no filtrar detalles (FR-023).
 */
public class ProviderUnavailableException extends RuntimeException {

    public ProviderUnavailableException(Throwable cause) {
        super(null, cause, false, false);
    }
}
