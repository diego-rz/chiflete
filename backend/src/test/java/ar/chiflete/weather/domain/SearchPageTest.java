package ar.chiflete.weather.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.List;
import java.util.stream.LongStream;

import org.junit.jupiter.api.Test;

class SearchPageTest {

    private static List<City> cities(int n) {
        return LongStream.rangeClosed(1, n)
                .mapToObj(i -> new City(i, "Ciudad " + i, null, null, 0, 0))
                .toList();
    }

    @Test
    void returnsTheRequestedSliceAndHasMoreWhenTheProviderReturnedExtra() {
        SearchPage page = SearchPage.from(cities(6), 0, 5);

        assertThat(page.items()).extracting(City::id).containsExactly(1L, 2L, 3L, 4L, 5L);
        assertThat(page.hasMore()).isTrue();
    }

    @Test
    void secondPageStartsAtOffset() {
        SearchPage page = SearchPage.from(cities(11), 5, 5);

        assertThat(page.items()).extracting(City::id).containsExactly(6L, 7L, 8L, 9L, 10L);
        assertThat(page.hasMore()).isTrue();
    }

    @Test
    void noMoreWhenTheProviderReturnedExactlyTheRequestedResults() {
        SearchPage page = SearchPage.from(cities(5), 0, 5);

        assertThat(page.items()).hasSize(5);
        assertThat(page.hasMore()).isFalse();
    }

    @Test
    void partialAndEmptyPages() {
        assertThat(SearchPage.from(cities(7), 5, 5).items()).extracting(City::id).containsExactly(6L, 7L);
        assertThat(SearchPage.from(cities(7), 5, 5).hasMore()).isFalse();
        assertThat(SearchPage.from(List.of(), 0, 5).items()).isEmpty();
        assertThat(SearchPage.from(cities(3), 5, 5).items()).isEmpty();
    }

    @Test
    void neverHasMoreBeyondTheProviderLimitOf100() {
        SearchPage page = SearchPage.from(cities(100), 95, 5);

        assertThat(page.items()).hasSize(5);
        assertThat(page.hasMore()).isFalse();
    }

    @Test
    void providerCountAsksForOneExtraUpTo100() {
        assertThat(SearchPage.providerCount(0, 5)).isEqualTo(6);
        assertThat(SearchPage.providerCount(5, 5)).isEqualTo(11);
        assertThat(SearchPage.providerCount(95, 5)).isEqualTo(100);
    }

    @Test
    void queryTrimsAndValidates() {
        CitySearchQuery query = CitySearchQuery.of("  cor  ", 0, 5);
        assertThat(query.text()).isEqualTo("cor");
        assertThat(query.providerCount()).isEqualTo(6);

        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("co", 0, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("   co   ", 0, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of(null, 0, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("a".repeat(101), 0, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("cordoba", -1, 5));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("cordoba", 0, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("cordoba", 0, 21));
        assertThatIllegalArgumentException().isThrownBy(() -> CitySearchQuery.of("cordoba", 96, 5));
        assertThat(CitySearchQuery.of("a".repeat(100), 95, 5).text()).hasSize(100);
    }
}
