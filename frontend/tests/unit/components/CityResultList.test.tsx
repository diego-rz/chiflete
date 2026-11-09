import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CityResultList } from "@/components/CityResultList";
import { t } from "@/i18n/t";
import { cordoba, sanJuan } from "./fixtures";

describe("CityResultList", () => {
  it("muestra el nombre en grande y provincia · país en pequeño y más claro", () => {
    render(<CityResultList items={[cordoba]} onSelect={() => undefined} />);

    const name = screen.getByText("Córdoba");
    expect(name.className).toContain("text-lg");
    const secondary = screen.getByText(`Provincia de Córdoba${t("list.separator")}Argentina`);
    expect(secondary.className).toContain("text-sm");
    expect(secondary.className).toMatch(/text-neutral-(500|600)/);
  });

  it("sin provincia muestra solo el país, sin separador sobrante", () => {
    render(<CityResultList items={[sanJuan]} onSelect={() => undefined} />);

    const item = screen.getByRole("button");
    expect(within(item).getByText("Puerto Rico").textContent).toBe("Puerto Rico");
    expect(item.textContent).not.toContain(t("list.separator").trim());
  });

  it("cada resultado es un botón de al menos 44 × 44 px", () => {
    render(<CityResultList items={[cordoba, sanJuan]} onSelect={() => undefined} />);

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("min-h-11");
      expect(button.className).toContain("min-w-11");
    }
  });

  it("al pulsar un resultado emite la ciudad", () => {
    const onSelect = vi.fn();
    render(<CityResultList items={[cordoba, sanJuan]} onSelect={onSelect} />);

    fireEvent.click(screen.getAllByRole("button")[1]!);

    expect(onSelect).toHaveBeenCalledWith(sanJuan);
  });

  it("con hasMore muestra Ver más resultados y sin hasMore no", () => {
    const { rerender } = render(
      <CityResultList items={[cordoba]} onSelect={() => undefined} hasMore={true} onLoadMore={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: t("search.loadMore") })).toBeTruthy();

    rerender(<CityResultList items={[cordoba]} onSelect={() => undefined} hasMore={false} onLoadMore={() => undefined} />);
    expect(screen.queryByRole("button", { name: t("search.loadMore") })).toBeNull();
  });
});
