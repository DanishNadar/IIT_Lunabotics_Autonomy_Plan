import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

const ADMIN_PASSWORD = "e2e-admin-password-not-real";

test.describe("public access and admin unlock", () => {
  test("visitors see everything without an account, read-only", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/board");
    await expect(page).toHaveURL(/\/board/);
    await expect(page.getByRole("heading", { level: 1, name: /All Tasks/ })).toBeVisible();
    // No login screen and no visible admin entry point.
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
    await expect(page.getByLabel("Admin password")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /My Tasks/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(0);

    await page.goto("/tasks/SF-01");
    await expect(page.getByRole("heading", { name: /Rover Pose Estimation/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Request \/ interest|Claim/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Comment" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Assign", exact: true })).toHaveCount(0);
    await expect(page.getByRole("checkbox").first()).toBeDisabled();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Autonomy overview" })).toBeVisible();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);
    await page.goto("/my-work");
    await expect(page).toHaveURL(/\/board/);
  });

  test("wrong admin password is rejected; the right one unlocks editing", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await page.getByLabel("Admin password").fill("not-the-admin-password");
    await page.getByRole("button", { name: "Unlock admin" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Admin password is incorrect" })).toBeVisible();

    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Unlock admin" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Administration" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Administration" })).toBeVisible();

    // Admin can add a team member who has no login.
    await page.getByLabel("Name", { exact: true }).fill("Taylor Example");
    await page.getByRole("button", { name: "Add member" }).click();
    await expect(page.getByRole("cell", { name: /Taylor Example/ })).toBeVisible();

    await page.goto("/tasks/SF-03");
    await expect(page.getByRole("button", { name: "Assign", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Lock admin" }).click();
    await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  });

  test("local demo personas still work for role-based testing", async ({ page }) => {
    await loginAs(page, "Demo Autonomy Lead");
    await expect(page.getByRole("heading", { name: "Autonomy overview" })).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("button", { name: "Account menu" })).toHaveCount(0);
  });
});
