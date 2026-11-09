import { t } from "@/i18n/t";

interface Props {
  onClick: () => void;
  loading: boolean;
  /** La última carga falló: se muestra "Error interno" y el botón sigue disponible (FR-009a). */
  failed: boolean;
}

/** Botón "Ver más resultados" (FR-009). */
export function LoadMoreButton({ onClick, loading, failed }: Props) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {failed && (
        <p role="alert" className="px-2 text-sm text-red-700 dark:text-red-400">
          {t("error.internal")}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        className="min-h-11 min-w-11 w-full rounded-lg px-4 font-medium text-blue-700 hover:bg-neutral-100 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-neutral-900"
      >
        {t("search.loadMore")}
      </button>
    </div>
  );
}
