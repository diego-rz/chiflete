import { expect, type Page } from "@playwright/test";

/**
 * Principio VII: a 320 px no hay scroll horizontal y todo elemento interactivo visible mide al
 * menos 44 × 44 px.
 */
export async function expectMobileFriendly(page: Page): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(320);
  for (const element of await page.locator("button:visible, input:visible, a[href]:visible").all()) {
    const box = await element.boundingBox();
    const html = await element.evaluate((e) => e.outerHTML.slice(0, 120));
    expect(box, html).not.toBeNull();
    expect(box!.width, html).toBeGreaterThanOrEqual(44);
    expect(box!.height, html).toBeGreaterThanOrEqual(44);
  }
}
