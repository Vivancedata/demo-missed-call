import { expect, test } from "@playwright/test";

test("the demo page renders and a sample enables triage", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page).toHaveTitle(/Missed-call demo/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/9pm voicemail, triaged by morning/i);

  const submit = page.getByRole("button", { name: /triage the call/i });
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: /9pm no-heat call/i }).click();
  await expect(page.getByRole("textbox", { name: /voicemail transcript/i })).toHaveValue(/615 Cordell Ave/);
  await expect(submit).toBeEnabled();

  expect(errors).toEqual([]);
});
