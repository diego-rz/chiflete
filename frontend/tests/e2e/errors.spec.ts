import { expect, test } from "@playwright/test";
import { expectMobileFriendly } from "./mobile";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

// Cada estado de error o aviso se comprueba también a 320 px (Principio VII).
test.afterEach(async ({ page }) => {
  await expectMobileFriendly(page);
});

test("una búsqueda sin coincidencias muestra Sin resultados", async ({ page }) => {
  await page.getByLabel("Buscar ciudad").fill("xyzqwv");

  await expect(page.getByText("Sin resultados")).toBeVisible();
  await expect(page.getByRole("list")).toHaveCount(0);
});

test("si el proveedor falla se muestra Error interno y se puede reintentar", async ({ page }) => {
  const searchBox = page.getByLabel("Buscar ciudad");
  await searchBox.fill("errores");

  await expect(page.getByText("Error interno")).toBeVisible();
  await expect(page.getByRole("list")).toHaveCount(0);

  await searchBox.fill("cordoba");
  await expect(page.getByText("Error interno")).toHaveCount(0);
  await expect(page.getByRole("list").getByRole("button")).toHaveCount(5);
});

test("los datos que el proveedor no informa se muestran como -", async ({ page }) => {
  await page.getByLabel("Buscar ciudad").fill("ushuaia");
  await page.getByRole("list").getByRole("button").first().click();

  const card = page.getByRole("region", { name: "Ushuaia" });
  await expect(card).toContainText("4,2 °C");
  await expect(card).toContainText("0 km/h");
  await expect(card.getByText("-", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Datos desactualizados")).toHaveCount(0);
});

test("una observación de más de 2 horas muestra la advertencia junto a los datos", async ({ page }) => {
  await page.getByLabel("Buscar ciudad").fill("vostok");
  await page.getByRole("list").getByRole("button").first().click();

  const card = page.getByRole("region", { name: "Vostok" });
  await expect(card.getByText("Datos desactualizados")).toBeVisible();
  await expect(card).toContainText("-52,3 °C");
  await expect(card).toContainText("Hora de observación");
});

test("si falla el clima se muestra Error interno y Actualizar reintenta", async ({ page }) => {
  let failures = 1;
  await page.route("**/api/current-weather**", async (route) => {
    if (failures-- > 0) {
      return route.fulfill({ status: 504, contentType: "application/json", body: '{"code":"PROVIDER_TIMEOUT"}' });
    }
    return route.continue();
  });
  await page.getByLabel("Buscar ciudad").fill("cordoba");
  await page.getByRole("list").getByRole("button").first().click();

  const card = page.getByRole("region", { name: "Córdoba" });
  await expect(card.getByText("Error interno")).toBeVisible();
  await expect(card).not.toContainText("°C");

  await card.getByRole("button", { name: "Actualizar" }).click();
  await expect(card).toContainText("20,8 °C");
  await expect(card.getByText("Error interno")).toHaveCount(0);
});
