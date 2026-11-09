package ar.chiflete.weather.application.port.out;

/**
 * El proveedor de datos no respondió a tiempo. No lleva el mensaje del proveedor, para no filtrar
 * detalles (FR-023).
 */
public class ProviderTimeoutException extends RuntimeException {

    public ProviderTimeoutException(Throwable cause) {
        super(null, cause, false, false);
    }
}
