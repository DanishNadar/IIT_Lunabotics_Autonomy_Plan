import { expect, test } from "@playwright/test";
import { expectToast, loginAs, selectOptionContaining } from "./helpers";

test.describe.serial("lead assignment → member execution → review", () => {
  test("lead assigns PM-04 to a member", async ({ page }) => {
    await loginAs(page, "Demo Autonomy Lead");
    await page.goto("/tasks/PM-04");
    await page.getByRole("button", { name: "Assign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await selectOptionContaining(dialog.getByLabel("Member"), "Demo Member A");
    await dialog.getByRole("button", { name: "Assign" }).click();
    await expectToast(page, "Demo Member A assigned");
    await expect(page.getByLabel("Task summary").getByText("Assigned", { exact: true })).toBeVisible();
    await expect(page.getByText("Primary owner")).toBeVisible();
  });

  test("member completes steps, submits evidence and requests review", async ({ page }) => {
    await loginAs(page, "Demo Member A");
    await page.goto("/my-work");
    await expect(page.getByText("Continue working")).toBeVisible();
    await page.goto("/tasks/PM-04");

    // Retry until hydrated: Radix menus ignore clicks that land before hydration.
    await expect(async () => {
      await page.getByRole("button", { name: "Move" }).click();
      await expect(page.getByRole("menuitem", { name: "Implementing" })).toBeVisible({ timeout: 1500 });
    }).toPass();
    await page.getByRole("menuitem", { name: "Implementing" }).click();
    await expect(page.getByLabel("Task summary").getByText("Implementing", { exact: true })).toBeVisible();

    const steps = page.locator("#steps").getByRole("checkbox");
    const n = await steps.count();
    expect(n).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < n; i++) {
      await steps.nth(i).click();
      await expect(steps.nth(i)).toHaveAttribute("aria-checked", "true");
    }

    const submits = page.locator("#deliverables").getByRole("button", { name: "Submit" });
    const count = await submits.count();
    for (let i = 0; i < count; i++) {
      await submits.nth(i).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Link").fill(`https://github.com/example/lunabot/blob/main/research/lusnar/artifact-${i}.md`);
      await dialog.getByRole("button", { name: "Submit" }).click();
      await expect(dialog).toBeHidden();
    }

    await page.getByRole("button", { name: "Link GitHub item" }).click();
    await page.getByPlaceholder("PR, issue, commit or branch URL").fill("https://github.com/example/lunabot/pull/7");
    await page.getByRole("button", { name: "Link", exact: true }).click();
    await expectToast(page, "GitHub link added");

    // Members cannot approve their own work: no review form for them.
    const review = page.locator("#review");
    await selectOptionContaining(review.getByLabel("Reviewer"), "Demo Autonomy Lead");
    await review.getByRole("button", { name: "Request review" }).click();
    await expectToast(page, "Review requested");
    await expect(review.getByText(/Awaiting review/)).toBeVisible();
    await expect(review.getByRole("button", { name: /Approve/ })).toHaveCount(0);
  });

  test("lead reviews with structured feedback and approves", async ({ page }) => {
    await loginAs(page, "Demo Autonomy Lead");
    await page.goto("/my-work#reviews");
    await expect(page.locator("#reviews").getByText("PM-04")).toBeVisible();
    await page.goto("/tasks/PM-04");
    const review = page.locator("#review");
    const groups = review.getByRole("radiogroup");
    for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).getByRole("radio", { name: "pass" }).click();
    await review.getByPlaceholder(/Summary/).fill("Inventory and feasibility notes verified against the archive listing.");
    await review.getByRole("button", { name: /Approve & complete/ }).click();
    await expectToast(page, "PM-04 approved and completed");
    await expect(review.getByText("Approved and completed.")).toBeVisible();
    await expect(review.getByText("Review history")).toBeVisible();
  });
});
