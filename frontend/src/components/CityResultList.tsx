import { LoadMoreButton } from "@/components/LoadMoreButton";
import { t } from "@/i18n/t";
import type { components } from "@/lib/api-types";

type City = components["schemas"]["City"];

interface Props {
  items: City[];
  onSelect: (city: City) => void;
  /** Hay más resultados: se ofrece "Ver más resultados" (FR-009). */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  loadMoreFailed?: boolean;
}

/** "Provincia · País", sin separadores sobrantes si falta alguno (Edge Cases). */
export function cityRegion(city: City): string {
  return [city.province, city.country].filter(Boolean).join(t("list.separator"));
}

/** Resultados de búsqueda: nombre grande; provincia y país más pequeños y claros (FR-007). */
export function CityResultList({
  items,
  onSelect,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  loadMoreFailed = false,
}: Props) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {items.map((city) => {
          const region = cityRegion(city);
          return (
            <li key={city.id}>
              <button
                type="button"
                onClick={() => onSelect(city)}
                className="block min-h-11 min-w-11 w-full px-4 py-2 text-left hover:bg-neutral-100 focus-visible:bg-neutral-100 dark:hover:bg-neutral-900 dark:focus-visible:bg-neutral-900"
              >
                <span className="block text-lg break-words">{city.name}</span>
                {region !== "" && (
                  <span className="block text-sm break-words text-neutral-600 dark:text-neutral-400">{region}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && onLoadMore !== undefined && (
        <LoadMoreButton onClick={onLoadMore} loading={loadingMore} failed={loadMoreFailed} />
      )}
    </div>
  );
}
