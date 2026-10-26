import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("authentication", () => {
  test("unauthenticated visitors are redirected to sign in", async ({ page }) => {
    await page.goto("/board");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Explore with a demo account")).toBeVisible();
    await expect(page.getByText("Demo data")).toBeVisible();
  });

  test("demo account sign-in and sign-out", async ({ page }) => {
    await loginAs(page, "Demo Autonomy Lead");
    await expect(page.getByRole("heading", { name: "Autonomy overview" })).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("register a real account, then sign in with password", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Create account" }).first().click();
    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email").fill("e2e.user@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account" }).last().click();
    await expect(page).toHaveURL(/\/my-work/);
    // First real account bootstraps as administrator when ADMIN_EMAILS is unset.
    await expect(page.getByRole("link", { name: "Administration" })).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill("e2e.user@example.com");
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).last().click();
    await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Sign in" }).last().click();
    await expect(page).toHaveURL("/");
  });

  test("viewers are read-only", async ({ page }) => {
    await loginAs(page, "Demo Viewer");
    await page.goto("/tasks/SF-01");
    await expect(page.getByRole("heading", { name: /Rover Pose Estimation/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Request \/ interest|Claim/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Comment" })).toHaveCount(0);
    await expect(page.getByRole("checkbox").first()).toBeDisabled();
  });
});
