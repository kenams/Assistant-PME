const { test, expect } = require("@playwright/test");

test("dashboard login + presentation mode", async ({ page }) => {
  await page.goto("/dashboard/");

  await page.getByRole("link", { name: "Connexion admin rapide" }).click();
  await expect(page.locator("#loginCard")).toBeHidden();
  await expect(page.locator("#sessionBadge")).toBeVisible();

  await page.getByRole("button", { name: "Mode presentation" }).click();
  await expect(page.locator("body")).toHaveClass(/presentation/);
  await expect(page.locator("#leadsCard")).toBeHidden();
  await expect(page.locator("#metricsGrid")).toBeVisible();
});
