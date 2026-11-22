import { expect, test } from "@playwright/test";
import { expectMobileFriendly } from "./mobile";

test("los nombres largos de ciudad, provincia y país se ajustan a 320 px", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Buscar ciudad").fill("llanfair");

  const result = page.getByRole("list").getByRole("button").first();
  await expect(result).toContainText("Reino Unido de Gran Bretaña e Irlanda del Norte");
  await expectMobileFriendly(page);

  await result.click();
  const card = page.getByRole("region", { name: /^Llanfair/ });
  await expect(card).toContainText("Isle of Anglesey County Council Administrative Area");
  await expectMobileFriendly(page);
});
