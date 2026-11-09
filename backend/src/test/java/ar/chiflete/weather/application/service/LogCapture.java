package ar.chiflete.weather.application.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.LoggerFactory;
import org.slf4j.event.KeyValuePair;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

/** Captura los eventos de log de una clase para inspeccionar sus pares clave-valor. */
final class LogCapture implements AutoCloseable {

    private final Logger logger;
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    LogCapture(Class<?> type) {
        logger = (Logger) LoggerFactory.getLogger(type);
        appender.start();
        logger.addAppender(appender);
    }

    List<ILoggingEvent> events() {
        return appender.list;
    }

    static Map<String, Object> keyValues(ILoggingEvent event) {
        List<KeyValuePair> pairs = event.getKeyValuePairs() == null ? List.of() : event.getKeyValuePairs();
        return pairs.stream().collect(Collectors.toMap(p -> p.key, p -> p.value));
    }

    /** Texto completo del evento (mensaje y valores), para comprobar que no contiene un dato. */
    static String fullText(ILoggingEvent event) {
        return event.getFormattedMessage() + " " + keyValues(event);
    }

    @Override
    public void close() {
        logger.detachAppender(appender);
    }
}
