import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginAs(page, "Demo Track Lead");
});

test("sidebar navigation reaches every main page", async ({ page }) => {
  const pages: [string, RegExp][] = [
    ["My Tasks", /My tasks/],
    ["All Tasks", /All Tasks/],
    ["Autonomy General", /Autonomy General/],
    ["Sensor Fusion", /Sensor Fusion & Localization/],
    ["Perception", /Perception & Mapping/],
    ["Navigation", /Navigation & Planning/],
    ["Simulations", /Simulation & Digital Twin/],
    ["Sprint Planning", /Sprint planning/],
    ["Dependency Graph", /Dependency graph/],
    ["Resources", /^Resources$/],
    ["Learning Paths", /Guided learning paths/],
    ["ROS Architecture", /ROS 2 architecture explorer/],
    ["Experiments & Testing", /Experiments & testing/],
    ["Team Members", /Team members/],
    ["Mission Readiness", /Mission readiness/],
    ["Knowledge Base", /Knowledge base/],
    ["Technical Roadmap", /Technical roadmap/],
    ["Activity Feed", /Activity feed/],
  ];
  for (const [link, heading] of pages) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: new RegExp(`${link}$`) }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("task board filtering by Discord channel, search, archived and table view", async ({ page }) => {
  await page.goto("/board");
  await expect(page.getByText("22 / 45 tasks")).toBeVisible();
  await page.getByRole("button", { name: /^Discord channel/ }).click();
  await page.getByRole("menuitemcheckbox", { name: /sensor-fusion/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("4 / 45 tasks")).toBeVisible();
  await expect(page).toHaveURL(/track=SF/);
  await page.getByLabel("Filter tasks").fill("calibration");
  await expect(page.getByText("1 / 45 tasks")).toBeVisible();
  await page.getByRole("tab", { name: /Table/ }).click();
  await expect(page.getByRole("cell", { name: "SF-02" })).toBeVisible();

  await page.goto("/board?backlog=archived&view=list");
  await expect(page.getByText("6 / 45 tasks")).toBeVisible();
  await expect(page.getByRole("link", { name: /CS-02/ })).toBeVisible();
});

test("old task links redirect to the re-keyed task with history notes", async ({ page }) => {
  await page.goto("/tasks/MS-01");
  await expect(page).toHaveURL(/\/tasks\/AG-01/);
  await expect(page.getByRole("heading", { name: /Autonomy Mission State Machine/ })).toBeVisible();
  await expect(page.getByText(/You followed a link to/)).toBeVisible();
  await expect(page.getByText("🧠").first()).toBeVisible();
  // SF-06 now names a different task; the page explains where the old one went.
  await page.goto("/tasks/SF-06");
  await expect(page.getByRole("heading", { name: /Sensor Fusion Benchmark Suite/ })).toBeVisible();
  await expect(page.getByText(/referred to a different task/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Adaptive Sensor Covariance Estimation.*now SF-08/ })).toBeVisible();
});

test("copy a task summary for Discord", async ({ page }) => {
  await page.goto("/tasks/SF-01");
  await expect(page.getByLabel("Task summary").getByText("sensor-fusion")).toBeVisible();
  await page.getByRole("button", { name: /Copy for Discord/ }).click();
  const summary = page.getByLabel("Discord summary");
  await expect(summary).toHaveValue(/\*\*\[SF-01\] Rover Pose Estimation and Sensor Fusion\*\*/);
  await expect(summary).toHaveValue(/Track: 🕸️ sensor-fusion/);
  await expect(summary).toHaveValue(/\*\*Acceptance:\*\*/);
});

test("Autonomy General lists external team interfaces and archived Controls work", async ({ page }) => {
  await page.goto("/tracks/AG");
  await expect(page.getByText("autonomy-general").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "External team interfaces" })).toBeVisible();
  await expect(page.getByText("Motion command interface, status and faults")).toBeVisible();
  await page.getByRole("button", { name: /Archived \(6\)/ }).click();
  await expect(page.getByRole("link", { name: /CS-01/ })).toBeVisible();
});

test("dependency graph renders and opens task details", async ({ page }) => {
  await page.goto("/graph");
  const node = page.locator(".react-flow__node").filter({ hasText: "SF-02" });
  await expect(node).toBeVisible();
  await node.click();
  await expect(page).toHaveURL(/\/tasks\/SF-02/);
  await expect(page.getByRole("heading", { name: /Sensor Extrinsic Calibration/ })).toBeVisible();
});

test("global search with Ctrl+K", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Search by task ID/).fill("hand eye calibration");
  await page.getByRole("option", { name: /SF-02/ }).click();
  await expect(page).toHaveURL(/\/tasks\/SF-02/);
});

test("track lead cannot assign outside their track", async ({ page }) => {
  await page.goto("/tasks/NV-01");
  await expect(page.getByRole("heading", { name: /A\* and S-Theta\* Path Planning/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign", exact: true })).toHaveCount(0);
  await page.goto("/tasks/SF-03");
  await expect(page.getByRole("button", { name: "Assign", exact: true })).toBeVisible();
});

test("task detail shows verified references with source symbols", async ({ page }) => {
  await page.goto("/tasks/CS-03");
  await page.locator("#references").getByRole("button", { name: /stall_detector\.py/ }).click();
  await expect(page.locator("#references").getByText("StallDetector.sensors_callback", { exact: false })).toBeVisible();
  await expect(page.locator("#references").getByRole("link", { name: /Open on GitHub/ })).toHaveAttribute("href", /PurdueLunabotics\/purdue_lunabotics\/blob\/master/);
});

test("start-here tour explains the mission loop and task lifecycle", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("heading", { level: 1, name: /Welcome to the/ })).toBeVisible();
  await page.getByRole("button", { name: /Stage 3:/ }).click();
  await expect(page.getByRole("heading", { name: "Drive to the dig zone" })).toBeVisible();
  await page.getByRole("button", { name: "In review" }).click();
  await expect(page.getByText(/reviewer checks the deliverables/)).toBeVisible();
});

test("guided walkthrough steps through a task and remembers progress", async ({ page }) => {
  await page.goto("/tasks/SF-01");
  await page.getByRole("button", { name: "Start walkthrough" }).click();
  const dialog = page.getByRole("dialog", { name: /Guided walkthrough for SF-01/ });
  await expect(dialog.getByRole("heading", { name: "Why this task matters" })).toBeVisible();
  await dialog.getByRole("button", { name: "Done, next step" }).click();
  await expect(dialog.getByText("Step 2 of")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("Step 3 of")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expect(page.getByText(/1\/\d+ done/)).toBeVisible();
});
