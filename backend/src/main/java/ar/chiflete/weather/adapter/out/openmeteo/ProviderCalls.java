package ar.chiflete.weather.adapter.out.openmeteo;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.function.Supplier;

import org.springframework.web.client.RestClientException;

import ar.chiflete.weather.application.port.out.ProviderTimeoutException;
import ar.chiflete.weather.application.port.out.ProviderUnavailableException;

/**
 * Traduce los fallos de una llamada a Open-Meteo a excepciones de puerto: tiempo agotado de
 * conexión o de lectura → {@link ProviderTimeoutException}; cualquier otro error (4xx, 5xx, red,
 * respuesta ilegible) → {@link ProviderUnavailableException}.
 */
final class ProviderCalls {

    private ProviderCalls() {
    }

    static <T> T call(Supplier<T> request) {
        try {
            return request.get();
        } catch (RestClientException e) {
            if (isTimeout(e)) {
                throw new ProviderTimeoutException();
            }
            throw new ProviderUnavailableException();
        }
    }

    private static boolean isTimeout(Throwable error) {
        for (Throwable t = error; t != null; t = t.getCause()) {
            if (t instanceof SocketTimeoutException || t instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
