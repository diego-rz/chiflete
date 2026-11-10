import { expect, test } from "@playwright/test";
import { expectMobileFriendly } from "./mobile";

test("la página carga en español, a 320 px y con la atribución de los datos", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Datos meteorológicos:");
  await expect(footer.getByRole("link", { name: "Open-Meteo" })).toHaveAttribute("href", "https://open-meteo.com/");
  await expect(footer).toContainText("Ubicaciones:");
  await expect(footer.getByRole("link", { name: "GeoNames" })).toHaveAttribute("href", "https://www.geonames.org/");

  await expectMobileFriendly(page);
});
