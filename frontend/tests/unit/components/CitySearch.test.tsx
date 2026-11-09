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
});
