import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { t } from "@/i18n/t";

describe("LoadMoreButton", () => {
  it("es un botón de al menos 44 × 44 px que pide más resultados", () => {
    const onClick = vi.fn();
    render(<LoadMoreButton onClick={onClick} loading={false} failed={false} />);

    const button = screen.getByRole("button", { name: t("search.loadMore") });
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("min-w-11");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("si la carga falló muestra Error interno y sigue disponible para reintentar", () => {
    const onClick = vi.fn();
    render(<LoadMoreButton onClick={onClick} loading={false} failed={true} />);

    expect(screen.getByRole("alert").textContent).toBe(t("error.internal"));
    fireEvent.click(screen.getByRole("button", { name: t("search.loadMore") }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("mientras carga no se puede volver a pulsar", () => {
    render(<LoadMoreButton onClick={() => undefined} loading={true} failed={false} />);

    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
