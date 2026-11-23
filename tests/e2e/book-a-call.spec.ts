import { expect, test } from "@playwright/test";
import type { TriagedCall } from "../../src/lib/schema";

test.use({ viewport: { width: 390, height: 844 } });

// /api/extract is stubbed so the test never calls the paid Anthropic endpoint.
const NO_HEAT: TriagedCall = {
  intent: "emergency",
  urgency: "tonight",
  caller_name: "Marta Villegas",
  callback_number: "",
  address_or_location: "615 Cordell Ave",
  issue_summary: "Furnace quit; freezing night; baby in the house.",
  suggested_reply: "Hi Marta, we got your message about the furnace and are calling you back now.",
  flagged_as_unclear: ["Callback number garbled: “five five five, oh one… [garbled]”"],
};

test("a phone visitor triages the sample and is offered a call", async ({ page }) => {
  await page.route("**/api/extract", (route) => route.fulfill({ json: { record: NO_HEAT } }));

  await page.goto("/");
  await page.getByRole("button", { name: /9pm no-heat call/i }).click();
  await page.getByRole("button", { name: /triage the call/i }).click();

  await expect(page.getByText("Flagged, not guessed")).toBeVisible();
  const cta = page.getByRole("link", { name: /book a call/i });
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toBeVisible();
  const href = new URL((await cta.getAttribute("href")) ?? "");
  expect(href.origin + href.pathname).toBe("https://www.vivancedata.com/contact");
  expect(href.searchParams.get("utm_source")).toBe("demo-missed-call");

  const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(noHorizontalScroll).toBe(true);

  await page.screenshot({ path: "test-results/book-a-call-390.png", fullPage: true });
});
