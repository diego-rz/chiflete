"use client";

import { useId, useState } from "react";
import { CityResultList } from "@/components/CityResultList";
import { t } from "@/i18n/t";
import type { components } from "@/lib/api-types";
import { useLatestRequest } from "@/lib/use-latest-request";

type City = components["schemas"]["City"];
type CitySearchPage = components["schemas"]["CitySearchPage"];

/** Mínimo de caracteres, sin contar los espacios de los extremos (FR-002). */
const MIN_QUERY_LENGTH = 3;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; page: CitySearchPage }
  | { status: "error" };

interface Props {
  onSelect: (city: City) => void;
}

/**
 * Cuadro de búsqueda. Busca desde el tercer carácter en cada cambio, sin Enter (FR-003, FR-004), y
 * la lista corresponde siempre al texto actual (Edge Cases, "Respuestas fuera de orden").
 */
export function CitySearch({ onSelect }: Props) {
  const inputId = useId();
  const [text, setText] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const { run, cancel } = useLatestRequest();

  function search(value: string) {
    setText(value);
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      cancel();
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    const params = new URLSearchParams({ query, offset: "0" });
    run(
      async (signal) => {
        const response = await fetch(`/api/cities?${params.toString()}`, { signal });
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as CitySearchPage;
      },
      (page) => setState({ status: "loaded", page }),
      () => setState({ status: "error" }),
    );
  }

  function select(city: City) {
    cancel();
    setState({ status: "idle" });
    onSelect(city);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {t("search.label")}
      </label>
      <input
        id={inputId}
        type="search"
        value={text}
        onChange={(event) => search(event.target.value)}
        placeholder={t("search.placeholder")}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="min-h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-base dark:border-neutral-700"
      />
      {state.status === "loading" && (
        <p role="status" className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("search.loading")}
        </p>
      )}
      {state.status === "loaded" && state.page.items.length > 0 && (
        <CityResultList items={state.page.items} onSelect={select} />
      )}
    </div>
  );
}
