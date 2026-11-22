import { t } from "@/i18n/t";

/** Advertencia visible de datos con más de 2 horas de antigüedad (FR-015). */
export function StaleWarning() {
  return (
    <p
      role="status"
      className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      {t("weather.stale")}
    </p>
  );
}
