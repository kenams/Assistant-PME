const { test, expect } = require("@playwright/test");

test("app admin flow + kb + chat + tickets + presentation", async ({ page }) => {
  await page.goto("/app/");

  await page.getByRole("link", { name: "Connexion admin rapide" }).click();
  await expect(page.locator("#loginCard")).toBeHidden();
  await expect(page.locator("#sessionBadge")).toBeVisible();

  const kbForm = page.locator("#kbForm");
  await kbForm.locator("input[name='title']").fill("Procedure VPN");
  await kbForm.locator("select[name='source_type']").selectOption("procedure");
  await kbForm
    .locator("textarea[name='content']")
    .fill("Verifiez le VPN puis reconnectez-vous.");
  await kbForm.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.locator("#kbList")).toContainText("Procedure VPN");

  const chatForm = page.locator("#chatForm");
  await chatForm.locator("input[name='message']").fill("Outlook ne marche pas");
  await chatForm.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator(".bubble.assistant").last()).toContainText("Voici");

  await chatForm
    .locator("input[name='message']")
    .fill("Impossible d'acceder au serveur");
  await chatForm.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator("#chatTickets")).toContainText("Support:");

  const ticketForm = page.locator("#ticketForm");
  await ticketForm.locator("input[name='title']").fill("Test ticket UI");
  await ticketForm.locator("input[name='category']").fill("network");
  await ticketForm.locator("select[name='priority']").selectOption("high");
  await ticketForm.locator("textarea[name='summary']").fill("Test creation ticket UI");
  await ticketForm.getByRole("button", { name: "Creer ticket" }).click();
  await expect(page.locator("#ticketsTable tbody")).toContainText("Test ticket UI");

  await page.getByRole("button", { name: "Mode presentation" }).click();
  await expect(page.locator("body")).toHaveClass(/presentation/);
  await expect(page.locator("#ticketsCard")).toBeHidden();
});
