import { expect, test } from "@playwright/test";

// Comprueba la base de la fase 2: la página carga en español y no hay scroll horizontal a 320 px.
test("la página carga a 320 px sin scroll horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
});
