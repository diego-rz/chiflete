import { t } from "@/i18n/t";

// Pantalla única. La búsqueda y el clima se añaden en la User Story 1.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("app.title")}</h1>
    </main>
  );
}
