const { test, expect } = require("@playwright/test");

test("crm login + presentation mode", async ({ page }) => {
  await page.goto("/crm/");

  await page.getByRole("link", { name: "Connexion admin rapide" }).click();
  await expect(page.locator("#loginCard")).toBeHidden();
  await expect(page.locator("#sessionBadge")).toBeVisible();

  await page.getByRole("button", { name: "Mode presentation" }).click();
  await expect(page.locator("body")).toHaveClass(/presentation/);
  await expect(page.locator(".filters")).toBeHidden();
});
