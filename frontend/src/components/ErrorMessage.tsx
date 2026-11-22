import { t } from "@/i18n/t";

interface Props {
  className?: string;
}

/** "Error interno", sin detalles técnicos ni el nombre del proveedor (FR-021 a FR-023). */
export function ErrorMessage({ className = "" }: Props) {
  return (
    <p role="alert" className={`text-sm font-medium text-red-700 dark:text-red-400 ${className}`.trim()}>
      {t("error.internal")}
    </p>
  );
}
