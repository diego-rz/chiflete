package ar.chiflete.weather.application.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.spi.LoggingEventBuilder;

import ar.chiflete.weather.application.port.out.ProviderTimeoutException;
import ar.chiflete.weather.application.port.out.ProviderUnavailableException;

/**
 * Una línea de log por petición con {@code operation}, {@code outcome}, {@code durationMs} y los
 * datos de contexto que se añadan (FR-028a). Si el proveedor falla, registra
 * {@code PROVIDER_ERROR} o {@code TIMEOUT} y propaga la excepción.
 */
final class OperationLog {

    private final Logger log;
    private final String operation;
    private final Map<String, Object> context = new LinkedHashMap<>();
    private final long startedNanos = System.nanoTime();

    private OperationLog(Logger log, String operation) {
        this.log = log;
        this.operation = operation;
    }

    static OperationLog start(Logger log, String operation) {
        return new OperationLog(log, operation);
    }

    OperationLog with(String key, Object value) {
        context.put(key, value);
        return this;
    }

    <T> T run(Supplier<T> providerCall) {
        try {
            return providerCall.get();
        } catch (ProviderTimeoutException e) {
            finish("TIMEOUT");
            throw e;
        } catch (ProviderUnavailableException e) {
            finish("PROVIDER_ERROR");
            throw e;
        }
    }

    void finish(String outcome) {
        LoggingEventBuilder event = "SUCCESS".equals(outcome) || "NO_RESULTS".equals(outcome)
                ? log.atInfo()
                : log.atWarn();
        event = event.addKeyValue("operation", operation).addKeyValue("outcome", outcome);
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            event = event.addKeyValue(entry.getKey(), entry.getValue());
        }
        event.addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedNanos))
                .log("Operation completed");
    }
}
