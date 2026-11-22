package ar.chiflete.weather.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

/**
 * El núcleo hexagonal (domain y application) no depende de Spring, de Jackson ni de los
 * adaptadores o la configuración. Se comprueba leyendo los imports del código fuente, sin
 * dependencias adicionales (Principio VI).
 */
class HexagonalArchitectureTest {

    private static final Path SOURCE_ROOT = Path.of("src/main/java/ar/chiflete/weather");

    private static final List<Pattern> FORBIDDEN_IMPORTS = List.of(
            Pattern.compile("^import\\s+(static\\s+)?org\\.springframework\\."),
            Pattern.compile("^import\\s+(static\\s+)?tools\\.jackson\\."),
            Pattern.compile("^import\\s+(static\\s+)?com\\.fasterxml\\."),
            Pattern.compile("^import\\s+(static\\s+)?ar\\.chiflete\\.weather\\.adapter\\."),
            Pattern.compile("^import\\s+(static\\s+)?ar\\.chiflete\\.weather\\.config\\."));

    @Test
    void domainDoesNotDependOnFrameworksOrAdapters() throws IOException {
        assertThat(violationsIn("domain")).isEmpty();
    }

    @Test
    void applicationDoesNotDependOnFrameworksOrAdapters() throws IOException {
        assertThat(violationsIn("application")).isEmpty();
    }

    @Test
    void detectsForbiddenImports() {
        assertThat(isForbidden("import org.springframework.stereotype.Service;")).isTrue();
        assertThat(isForbidden("import ar.chiflete.weather.adapter.out.openmeteo.X;")).isTrue();
        assertThat(isForbidden("import java.time.Clock;")).isFalse();
        assertThat(isForbidden("import org.slf4j.Logger;")).isFalse();
    }

    private static List<String> violationsIn(String layer) throws IOException {
        Path dir = SOURCE_ROOT.resolve(layer);
        List<String> violations = new ArrayList<>();
        if (!Files.isDirectory(dir)) {
            return violations;
        }
        try (Stream<Path> files = Files.walk(dir)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                for (String line : Files.readAllLines(file)) {
                    if (isForbidden(line.strip())) {
                        violations.add(SOURCE_ROOT.relativize(file) + ": " + line.strip());
                    }
                }
            }
        }
        return violations;
    }

    private static boolean isForbidden(String line) {
        return FORBIDDEN_IMPORTS.stream().anyMatch(p -> p.matcher(line).find());
    }
}
