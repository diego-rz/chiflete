package ar.chiflete.weather.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import ar.chiflete.weather.application.port.out.CityCatalog;
import ar.chiflete.weather.application.port.out.ProviderTimeoutException;
import ar.chiflete.weather.application.port.out.ProviderUnavailableException;
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

    @Test
    void secondPageAsksForElevenAndLogsItsOffset() {
        catalog.results = cities(12);

        SearchPage page = service.search("san", 5, 5);

        assertThat(catalog.requests).containsExactly("san|11");
        assertThat(page.items()).extracting(City::id).containsExactly(6L, 7L, 8L, 9L, 10L);
        assertThat(page.hasMore()).isTrue();
        assertThat(LogCapture.keyValues(logs.events().getFirst()))
                .containsEntry("operation", "SEARCH")
                .containsEntry("offset", 5);
    }

    @Test
    void providerFailuresAreLoggedAndPropagated() {
        catalog.failure = new ProviderUnavailableException();
        assertThatThrownBy(() -> service.search("cordoba", 0, 5)).isInstanceOf(ProviderUnavailableException.class);

        catalog.failure = new ProviderTimeoutException();
        assertThatThrownBy(() -> service.search("cordoba", 5, 5)).isInstanceOf(ProviderTimeoutException.class);

        assertThat(logs.events()).hasSize(2);
        assertThat(LogCapture.keyValues(logs.events().get(0)))
                .containsEntry("outcome", "PROVIDER_ERROR").containsEntry("offset", 0).containsKey("durationMs");
        assertThat(LogCapture.keyValues(logs.events().get(1)))
                .containsEntry("outcome", "TIMEOUT").containsEntry("offset", 5).containsKey("durationMs");
        assertThat(logs.events()).allSatisfy(e -> assertThat(LogCapture.fullText(e)).doesNotContain("cordoba"));
    }

    private static List<City> cities(int n) {
        return LongStream.rangeClosed(1, n).mapToObj(i -> new City(i, "Córdoba " + i, null, null, 0, 0)).toList();
    }

    static final class FakeCatalog implements CityCatalog {
        List<City> results = List.of();
        RuntimeException failure;
        final List<String> requests = new ArrayList<>();

        @Override
        public List<City> search(String text, int count) {
            requests.add(text + "|" + count);
            if (failure != null) {
                throw failure;
            }
            return results.subList(0, Math.min(count, results.size()));
        }
    }
}
