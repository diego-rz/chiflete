package ar.chiflete.weather.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import ar.chiflete.weather.application.port.out.CityCatalog;
import ar.chiflete.weather.domain.City;
import ar.chiflete.weather.domain.SearchPage;

class SearchCitiesServiceTest {

    private final FakeCatalog catalog = new FakeCatalog();
    private final SearchCitiesService service = new SearchCitiesService(catalog);
    private final LogCapture logs = new LogCapture(SearchCitiesService.class);

    @AfterEach
    void detach() {
        logs.close();
    }

    @Test
    void trimsTheTextAndAsksOneExtraResult() {
        catalog.results = cities(6);

        SearchPage page = service.search("  cordoba ", 0, 5);

        assertThat(catalog.requests).containsExactly("cordoba|6");
        assertThat(page.items()).hasSize(5);
        assertThat(page.hasMore()).isTrue();
    }

    @Test
    void rejectsTooShortOrTooLongTextWithoutCallingTheProvider() {
        assertThatIllegalArgumentException().isThrownBy(() -> service.search("co", 0, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> service.search("   ", 0, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> service.search("x".repeat(101), 0, 5));
        assertThat(catalog.requests).isEmpty();
    }

    @Test
    void logsSuccessWithOffsetAndDurationButNotTheText() {
        catalog.results = cities(2);

        service.search("cordoba", 0, 5);

        assertThat(logs.events()).hasSize(1);
        Map<String, Object> entry = LogCapture.keyValues(logs.events().getFirst());
        assertThat(entry).containsEntry("operation", "SEARCH")
                .containsEntry("outcome", "SUCCESS")
                .containsEntry("offset", 0)
                .containsKey("durationMs");
        assertThat(LogCapture.fullText(logs.events().getFirst())).doesNotContainIgnoringCase("cordoba");
    }

    @Test
    void logsNoResults() {
        catalog.results = List.of();

        service.search("xyzqwv", 0, 5);

        assertThat(LogCapture.keyValues(logs.events().getFirst())).containsEntry("outcome", "NO_RESULTS");
        assertThat(LogCapture.fullText(logs.events().getFirst())).doesNotContain("xyzqwv");
    }

    private static List<City> cities(int n) {
        return LongStream.rangeClosed(1, n).mapToObj(i -> new City(i, "Córdoba " + i, null, null, 0, 0)).toList();
    }

    static final class FakeCatalog implements CityCatalog {
        List<City> results = List.of();
        final List<String> requests = new ArrayList<>();

        @Override
        public List<City> search(String text, int count) {
            requests.add(text + "|" + count);
            return results.subList(0, Math.min(count, results.size()));
        }
    }
}
