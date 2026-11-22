import { expect, test } from "@playwright/test";
import { expectMobileFriendly } from "./mobile";

test("buscar una ciudad, ver su clima, actualizarlo y cambiar de ciudad", async ({ page, context }) => {
  await page.goto("/");
  const searchBox = page.getByLabel("Buscar ciudad");

  // Escribir sin pulsar Enter muestra 5 resultados.
  await searchBox.fill("cordoba");
  const results = page.getByRole("list").getByRole("button");
  await expect(results).toHaveCount(5);
  await expect(results.first()).toContainText("Córdoba");
  await expect(results.first()).toContainText("Provincia de Córdoba · Argentina");
  await expectMobileFriendly(page);

  // Elegir el primero cierra la lista y muestra el clima.
  await results.first().click();
  await expect(page.getByRole("list")).toHaveCount(0);
  const card = page.getByRole("region", { name: "Córdoba" });
  await expect(card).toContainText("20,8 °C");
  for (const value of ["0 mm", "3,6 km/h", "69 %", "1010,9 hPa", "49,3 km", "Hora de observación"]) {
    await expect(card).toContainText(value);
  }
  await expectMobileFriendly(page);

  // "Actualizar" vuelve a pedir el clima.
  const refreshed = page.waitForRequest((request) => request.url().includes("/api/current-weather"));
  await card.getByRole("button", { name: "Actualizar" }).click();
  await refreshed;
  await expect(card).toContainText("20,8 °C");

  // Elegir otra ciudad, con su clima retrasado: "Cargando…" sin datos de la anterior y luego la nueva.
  let releaseWeather!: () => void;
  const weatherReleased = new Promise<void>((resolve) => (releaseWeather = resolve));
  await page.route("**/api/current-weather**", async (route) => {
    await weatherReleased;
    await route.continue();
  });
  await searchBox.fill("rosario");
  await page.getByRole("list").getByRole("button").first().click();
  const newCard = page.getByRole("region", { name: "Rosario" });
  await expect(newCard).toContainText("Cargando…");
  await expect(page.getByText("20,8 °C")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Córdoba" })).toHaveCount(0);
  releaseWeather();
  await expect(newCard).toContainText("17,3 °C");
  await expect(newCard.getByText("E", { exact: true })).toBeVisible();
  await expectMobileFriendly(page);
  await page.unroute("**/api/current-weather**");

  // Al recargar no queda rastro de la búsqueda ni de la ciudad (FR-026, SC-008).
  await page.reload();
  await expect(page.getByLabel("Buscar ciudad")).toHaveValue("");
  await expect(page.getByRole("region")).toHaveCount(0);
  expect(await context.cookies()).toEqual([]);
  const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  expect(storage).toEqual({ local: 0, session: 0 });
});
