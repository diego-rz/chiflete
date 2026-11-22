package ar.chiflete.weather.application.port.out;

/**
 * El proveedor de datos no respondió a tiempo (FR-022a). No lleva mensaje ni causa, por la misma
 * razón que {@link ProviderUnavailableException}.
 */
public class ProviderTimeoutException extends RuntimeException {

    public ProviderTimeoutException() {
        super(null, null, false, false);
    }
}
