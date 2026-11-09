import { expect, test } from "@playwright/test";

test("Ver más resultados añade tandas de 5 hasta agotarlos", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar ciudad").fill("san");

  const results = page.getByRole("list").getByRole("button");
  const loadMore = page.getByRole("button", { name: "Ver más resultados" });
  await expect(results).toHaveCount(5);

  await loadMore.click();
  await expect(results).toHaveCount(10);
  await expect(results.first()).toContainText("San Juan");

  await loadMore.click();
  await expect(results).toHaveCount(12);
  await expect(loadMore).toHaveCount(0);

  // Nombres largos sin scroll horizontal a 320 px.
  await expect(page.getByText("San Fernando del Valle de Catamarca")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("si falla la carga de más resultados se conservan los anteriores y se puede reintentar", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar ciudad").fill("san");
  const results = page.getByRole("list").getByRole("button");
  const loadMore = page.getByRole("button", { name: "Ver más resultados" });
  await expect(results).toHaveCount(5);

  // El primer intento de la segunda tanda falla (FR-009a).
  let failed = false;
  await page.route("**/api/cities?*offset=5*", async (route) => {
    if (failed) return route.continue();
    failed = true;
    await route.fulfill({ status: 502, contentType: "application/json", body: '{"code":"PROVIDER_UNAVAILABLE"}' });
  });

  await loadMore.click();
  await expect(page.getByRole("alert").filter({ hasText: "Error interno" })).toBeVisible();
  await expect(results).toHaveCount(5);
  await expect(loadMore).toBeEnabled();
  const box = await loadMore.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await loadMore.click();
  await expect(results).toHaveCount(10);
  await expect(page.getByText("Error interno")).toHaveCount(0);
});
