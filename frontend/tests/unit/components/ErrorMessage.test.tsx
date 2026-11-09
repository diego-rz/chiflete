import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorMessage } from "@/components/ErrorMessage";
import { t } from "@/i18n/t";

describe("ErrorMessage", () => {
  it("muestra Error interno como alerta, sin detalles técnicos", () => {
    render(<ErrorMessage />);

    expect(screen.getByRole("alert").textContent).toBe(t("error.internal"));
  });
});
