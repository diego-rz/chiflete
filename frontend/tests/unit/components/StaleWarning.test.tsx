import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaleWarning } from "@/components/StaleWarning";
import { t } from "@/i18n/t";

describe("StaleWarning", () => {
  it("avisa de que los datos están desactualizados", () => {
    render(<StaleWarning />);

    expect(screen.getByRole("status").textContent).toBe(t("weather.stale"));
  });
});
