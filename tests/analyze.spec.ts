import { test, expect } from "@playwright/test";

test("analyzes a resume against a job posting", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Job Posting").fill(
    "Data Analyst role. Must have SQL and Python. Nice to have ETL."
  );
  await page.getByLabel("Resume").fill(
    "Experience: SQL reporting and dashboarding."
  );

  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByText("Match score:")).toBeVisible();
  await expect(page.getByText("Missing skills:")).toBeVisible();
  await expect(page.getByText("Suggested resume bullets:")).toBeVisible();
});
