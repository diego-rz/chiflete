import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CitySearch } from "@/components/CitySearch";
import { t } from "@/i18n/t";
import { cordoba, jsonResponse, sanJuan } from "./fixtures";

describe("CitySearch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function type(text: string) {
    fireEvent.change(screen.getByLabelText(t("search.label")), { target: { value: text } });
  }

  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("no busca con 1 o 2 caracteres ni con solo espacios", async () => {
    render(<CitySearch onSelect={() => undefined} />);

    type("c");
    type("co");
    type("     ");
    type(" co ");
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("busca al escribir el tercer carácter, sin Enter, y en cada cambio", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [cordoba], hasMore: false }));
    render(<CitySearch onSelect={() => undefined} />);

    type("cor");
    await settle();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/cities?query=cor&offset=0");
    expect(screen.getByRole("list")).toBeTruthy();

    type("cord");
    await settle();
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("/api/cities?query=cord&offset=0");
  });

  it("recorta los espacios de los extremos al buscar", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [], hasMore: false }));
    render(<CitySearch onSelect={() => undefined} />);

    type("  san juan  ");
    await settle();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/cities?query=san+juan&offset=0");
  });

  it("muestra un indicador de carga mientras busca", async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => (respond = resolve)));
    render(<CitySearch onSelect={() => undefined} />);

    type("cor");
    expect(screen.getByText(t("search.loading"))).toBeTruthy();

    respond(jsonResponse({ items: [cordoba], hasMore: false }));
    await settle();
    expect(screen.queryByText(t("search.loading"))).toBeNull();
  });

  it("al bajar de 3 caracteres desaparece la lista", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [cordoba], hasMore: false }));
    render(<CitySearch onSelect={() => undefined} />);

    type("cor");
    await settle();
    expect(screen.getByRole("list")).toBeTruthy();

    type("co");
    await settle();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("al elegir una ciudad la emite y cierra la lista", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [cordoba, sanJuan], hasMore: false }));
    const onSelect = vi.fn();
    render(<CitySearch onSelect={onSelect} />);

    type("cor");
    await settle();
    fireEvent.click(screen.getAllByRole("button")[0]!);

    expect(onSelect).toHaveBeenCalledWith(cordoba);
    expect(screen.queryByRole("list")).toBeNull();
  });

  describe("sin resultados y errores", () => {
    it("una búsqueda sin coincidencias muestra Sin resultados", async () => {
      fetchMock.mockImplementation(async () => jsonResponse({ items: [], hasMore: false }));
      render(<CitySearch onSelect={() => undefined} />);

      type("xyzqwv");
      await settle();

      expect(screen.getByText(t("search.noResults"))).toBeTruthy();
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("cualquier respuesta no 2xx muestra Error interno y ningún resultado", async () => {
      for (const status of [400, 500, 502, 504]) {
        fetchMock.mockImplementation(async () => jsonResponse({ code: "PROVIDER_UNAVAILABLE" }, status));
        const { unmount } = render(<CitySearch onSelect={() => undefined} />);

        type("cordoba");
        await settle();

        expect(screen.getByRole("alert").textContent).toBe(t("error.internal"));
        expect(screen.queryByRole("list")).toBeNull();
        unmount();
      }
    });

    it("una nueva búsqueda tras el error vuelve a intentarlo", async () => {
      fetchMock.mockImplementationOnce(async () => jsonResponse({ code: "PROVIDER_TIMEOUT" }, 504));
      fetchMock.mockImplementation(async () => jsonResponse({ items: [cordoba], hasMore: false }));
      render(<CitySearch onSelect={() => undefined} />);

      type("cordoba");
      await settle();
      expect(screen.getByRole("alert")).toBeTruthy();

      type("cordob");
      await settle();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByRole("list")).toBeTruthy();
    });

    it("al bajar de 3 caracteres desaparecen los mensajes", async () => {
      fetchMock.mockImplementation(async () => jsonResponse({ items: [], hasMore: false }));
      render(<CitySearch onSelect={() => undefined} />);

      type("xyzqwv");
      await settle();
      type("xy");
      await settle();

      expect(screen.queryByText(t("search.noResults"))).toBeNull();
    });
  });

  describe("Ver más resultados", () => {
    const sanCities = Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      name: `San ${i + 1}`,
      country: "Argentina",
      latitude: -30 - i,
      longitude: -60,
    }));

    function page(offset: number) {
      return { items: sanCities.slice(offset, offset + 5), hasMore: sanCities.length > offset + 5 };
    }

    function shownNames() {
      return screen.getAllByRole("button").filter((b) => b.textContent?.startsWith("San ")).map((b) => b.textContent);
    }

    it("añade la siguiente tanda sin perder la anterior y desaparece al agotarlos", async () => {
      fetchMock.mockImplementation(async (input) => {
        const offset = Number(new URL(String(input), "http://localhost").searchParams.get("offset"));
        return jsonResponse(page(offset));
      });
      render(<CitySearch onSelect={() => undefined} />);

      type("san");
      await settle();
      expect(shownNames()).toHaveLength(5);

      fireEvent.click(screen.getByRole("button", { name: t("search.loadMore") }));
      await settle();
      expect(String(fetchMock.mock.calls[1]?.[0])).toBe("/api/cities?query=san&offset=5");
      expect(shownNames()).toHaveLength(10);
      expect(shownNames()[0]).toContain("San 1");

      fireEvent.click(screen.getByRole("button", { name: t("search.loadMore") }));
      await settle();
      expect(shownNames()).toHaveLength(12);
      expect(screen.queryByRole("button", { name: t("search.loadMore") })).toBeNull();
    });

    it("si falla conserva los resultados, muestra Error interno debajo y permite reintentar", async () => {
      let failNext = false;
      fetchMock.mockImplementation(async (input) => {
        const offset = Number(new URL(String(input), "http://localhost").searchParams.get("offset"));
        if (failNext) {
          failNext = false;
          return jsonResponse({ code: "PROVIDER_UNAVAILABLE" }, 502);
        }
        return jsonResponse(page(offset));
      });
      render(<CitySearch onSelect={() => undefined} />);
      type("san");
      await settle();

      failNext = true;
      fireEvent.click(screen.getByRole("button", { name: t("search.loadMore") }));
      await settle();
      expect(shownNames()).toHaveLength(5);
      expect(screen.getByRole("alert").textContent).toBe(t("error.internal"));

      fireEvent.click(screen.getByRole("button", { name: t("search.loadMore") }));
      await settle();
      expect(shownNames()).toHaveLength(10);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("al cambiar el texto vuelve a mostrar solo los 5 primeros de la nueva búsqueda", async () => {
      fetchMock.mockImplementation(async (input) => {
        const offset = Number(new URL(String(input), "http://localhost").searchParams.get("offset"));
        return jsonResponse(page(offset));
      });
      render(<CitySearch onSelect={() => undefined} />);
      type("san");
      await settle();
      fireEvent.click(screen.getByRole("button", { name: t("search.loadMore") }));
      await settle();
      expect(shownNames()).toHaveLength(10);

      type("san ");
      type("sant");
      await settle();
      expect(String(fetchMock.mock.lastCall?.[0])).toBe("/api/cities?query=sant&offset=0");
      expect(shownNames()).toHaveLength(5);
    });
  });
});
