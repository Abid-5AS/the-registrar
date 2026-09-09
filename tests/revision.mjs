import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.GAME_URL || "http://localhost:5173";
const out = process.env.QA_DIR || "test-results";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto(base);
  await page
    .getByRole("button", { name: "Run to your exam", exact: true })
    .click();
  await page.getByRole("button", { name: "Let’s run", exact: true }).click();
  await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < 31; i++) await page.clock.runFor(1000);
  await expect(page.locator("#room")).toHaveText("402");
  await expect(page.locator("#email")).toContainText("Room 301 → Room 402");
  await expect(page.locator("#route")).toContainText("MIDDLE LANE");
  await expect(page.locator("#hearts")).toHaveAttribute(
    "aria-label",
    /3 admit cards/,
  );
  await page.screenshot({ path: `${out}/revision-guidance.png` });
  await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 13; i++) await page.clock.runFor(1000);
  await expect(page.locator("#hearts")).toHaveAttribute(
    "aria-label",
    /3 admit cards/,
  );
  await expect(page.locator("#route")).not.toHaveClass(/active/);
  console.log(
    "PASS Real production runner: first revision, readable email, correct arrow, clear gate, and safe arrival",
  );
  await page.screenshot({ path: `${out}/runner-after-revision.png` });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Back to campus", exact: false })
    .click();
  await page.locator('[data-mode="inbox"]').click();
  await page
    .getByRole("button", { name: "Open your inbox", exact: true })
    .click();
  await page.locator('[data-action="inbox-sprint"]').click();
  await page.clock.fastForward(62000);
  await page.screenshot({ path: `${out}/sprint-end.png` });
  await expect(page.locator(".result-panel")).toContainText(
    "filing sprint is complete",
  );
  console.log("PASS Optional inbox sprint ends calmly at 60 seconds");
  expect(errors).toEqual([]);
  await writeFile(
    `${out}/revision-results.json`,
    JSON.stringify(
      {
        checks: [
          "First revision UI and safe arrival",
          "Optional 60-second sprint ending",
        ],
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
