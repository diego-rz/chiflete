package ar.chiflete.weather.adapter.in.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import ar.chiflete.weather.adapter.in.web.model.Error;
import ar.chiflete.weather.adapter.in.web.model.Error.CodeEnum;

/**
 * Traduce las excepciones a las respuestas de error del contrato. Los cuerpos solo llevan
 * {@code code}: nunca trazas, rutas ni mensajes (FR-023, Principio IV).
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler({
            ServletRequestBindingException.class,
            TypeMismatchException.class,
            IllegalArgumentException.class})
    ResponseEntity<Error> invalidRequest(Exception ex) {
        return error(HttpStatus.BAD_REQUEST, CodeEnum.INVALID_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Void> unexpected(Exception ex) {
        // Solo el tipo y el origen: el mensaje podría contener datos de la petición (Principio V).
        StackTraceElement origin = ex.getStackTrace().length > 0 ? ex.getStackTrace()[0] : null;
        log.atError()
                .addKeyValue("exception", ex.getClass().getName())
                .addKeyValue("origin", String.valueOf(origin))
                .log("Unexpected error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }

    static ResponseEntity<Error> error(HttpStatus status, CodeEnum code) {
        return ResponseEntity.status(status).body(new Error(code));
    }
}
