import { expect, type Locator, type Page } from "@playwright/test";

export async function loginAs(page: Page, name: string) {
  await page.context().clearCookies();
  await page.goto("/admin");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL((u) => u.pathname === "/");
}

export async function selectOptionContaining(select: Locator, text: string) {
  const value = await select.locator("option", { hasText: text }).first().getAttribute("value");
  if (value === null) throw new Error(`No option containing ${text}`);
  await select.selectOption(value);
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}
