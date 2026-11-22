package ar.chiflete.weather.adapter.in.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Traducción de errores a respuestas sin detalles internos (FR-023, Principio IV). Usa un
 * controlador que solo existe en esta prueba, para no depender de los controladores reales.
 */
class ApiExceptionHandlerTest {

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new TestOnlyController())
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void missingParameterReturnsInvalidRequest() throws Exception {
        mvc.perform(get("/test/number"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
    }

    @Test
    void malformedParameterReturnsInvalidRequest() throws Exception {
        mvc.perform(get("/test/number").param("value", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
    }

    @Test
    void invalidArgumentFromDomainReturnsInvalidRequest() throws Exception {
        mvc.perform(get("/test/number").param("value", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":\"INVALID_REQUEST\"}", true));
    }

    @Test
    void unexpectedExceptionReturns500WithoutDetails() throws Exception {
        mvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(""));
    }

    @RestController
    static class TestOnlyController {

        @GetMapping("/test/number")
        String number(@RequestParam("value") int value) {
            if (value < 0) {
                throw new IllegalArgumentException("secret detail: value must be positive");
            }
            return "ok";
        }

        @GetMapping("/test/boom")
        String boom() {
            throw new IllegalStateException("secret detail at /internal/path");
        }
    }
}
