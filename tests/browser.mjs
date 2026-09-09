import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.GAME_URL || "http://localhost:5173";
const out = process.env.QA_DIR || "test-results";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const errors = [];
const failed = [];
const checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("requestfailed", (r) => failed.push(r.url()));
const check = (message) => {
  checks.push(message);
  console.log("PASS", message);
};
const start = async (mode, button) => {
  if (mode) await page.locator(`[data-mode="${mode}"]`).click();
  await page.getByRole("button", { name: button, exact: true }).click();
};
const home = async () => {
  await page.getByRole("button", { name: "Main menu", exact: true }).click();
};
try {
  await page.goto(base);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${out}/menu-desktop.png` });
  check("Desktop menu and 3D canvas render");
  await start("survival", "Run to your exam");
  await page.getByRole("button", { name: "Let’s run", exact: true }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("canvas")).toHaveAttribute(
    "aria-label",
    /left lane/,
  );
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /jumping/);
  await page.waitForTimeout(1100);
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("canvas")).toHaveAttribute("aria-label", /sliding/);
  await page.waitForTimeout(1100);
  await page.keyboard.press("d");
  await expect(page.locator("canvas")).toHaveAttribute(
    "aria-label",
    /middle lane/,
  );
  check("Keyboard lane change, jump, slide, and WASD operate actual runner");
  await page.locator('[data-action="fullscreen"]').click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.locator('[data-action="fullscreen"]').click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.setViewportSize({ width: 1440, height: 900 });
  check("Fullscreen enters and exits without losing the run");
  await page.screenshot({ path: `${out}/runner-desktop.png` });
  await page.keyboard.press("p");
  await expect(page.getByText("The emails can wait.")).toBeVisible();
  const score = await page.locator("#score").textContent();
  await page.waitForTimeout(250);
  expect(await page.locator("#score").textContent()).toBe(score);
  check("Pause freezes score");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Back to campus", exact: false })
    .click();
  await start("simulator", "Report for duty");
  await expect(
    page.getByText("The schedule is ready.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `${out}/office-desktop.png` });
  await page
    .locator('[data-stamp="REVISED"]')
    .dragTo(page.locator("#craft-paper"));
  await expect(page.locator("#paper-count")).toContainText("STACK 1");
  for (let i = 0; i < 9; i++)
    await page.locator('[data-action="stamp"]').first().click();
  await expect(page.locator("#paper-count")).toContainText("STACK 10");
  check("Revision desk supports dragging, tapping, and stack 10");
  for (let i = 0; i < 8; i++) {
    await page.locator('[data-action="office-choice"]').first().click();
    await expect(page.locator(".decision-outcome")).toBeVisible();
    if (i === 2) {
      const meters = await page.locator(".office-meters").innerText();
      await page.reload();
      await page.locator('[data-mode="simulator"]').click();
      await page
        .getByRole("button", { name: "Continue your office day", exact: true })
        .click();
      await expect(page.locator(".decision-outcome")).toBeVisible();
      expect(await page.locator(".office-meters").innerText()).toBe(meters);
      check("Partial office day resumes without reapplying decision effects");
    }
    await page.locator('[data-action="office-next"]').click();
  }
  await expect(page.locator(".result-panel")).toContainText("100%");
  check("Complete office day with high clarity and progression");
  await home();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator('[data-setting="chaosLevel"]').selectOption("relaxed");
  await page.locator('[data-setting="largeText"]').check();
  await page.locator('[data-setting="highContrast"]').check();
  await page.locator('[data-setting="masterVolume"]').fill("0");
  await page.locator('[data-setting="masterVolume"]').dispatchEvent("change");
  await page.getByRole("button", { name: "All set", exact: false }).click();
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/large-text/);
  await expect(page.locator("body")).toHaveClass(/high-contrast/);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator('[data-setting="chaosLevel"]')).toHaveValue(
    "relaxed",
  );
  await page.locator('[data-setting="largeText"]').uncheck();
  await page.locator('[data-setting="highContrast"]').uncheck();
  await page.getByRole("button", { name: "All set", exact: false }).click();
  check("Settings persist across reload");
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "CGPA", exact: true }).click();
  await expect(page.locator(".legend-modal")).toBeVisible();
  await page.getByRole("button", { name: "Duly noted.", exact: true }).click();
  check("Five CGPA clicks unlock the legendary event");
  await start("inbox", "Open your inbox");
  await page
    .getByRole("button", { name: "Start quiet filing", exact: false })
    .click();
  const quietClock = await page.locator("#inbox-clock").textContent();
  await page.waitForTimeout(250);
  expect(await page.locator("#inbox-clock").textContent()).toBe(quietClock);
  for (let i = 0; i < 6; i++) {
    if (i === 0)
      for (const version of [1, 2, 3])
        await page.locator(`[data-version="${version}"]`).click();
    if (i === 1)
      for (const version of [5, 6])
        await page.locator(`[data-version="${version}"]`).click();
    await expect(page.locator(".inbox-list")).toBeVisible();
    await page.locator(`[data-version="${(i + 1) * 4}"]`).click();
    await expect(page.locator(".filing-receipt")).toBeVisible();
    if (i === 3) await page.screenshot({ path: `${out}/inbox-desktop.png` });
    await page.locator('[data-action="inbox-next"]').click();
  }
  await expect(page.locator(".result-panel")).toContainText(
    "Six batches sorted",
  );
  check(
    "Untimed inbox has no life penalty, archives wrong choices, and completes six logical batches",
  );
  await home();
  await start("roulette", "Open an attachment");
  const clues = [
    ["Course /", "Exam Schedule"],
    ["Hall B /", "Seat Plan"],
    ["Classes suspended", "Holiday Notice"],
    ["Credits:", "Course Registration"],
    ["Merit award", "Scholarship"],
    ["Route 03", "Campus Transport"],
    ["Phones prohibited", "Exam Warning"],
    ["Rice /", "Cafeteria Menu"],
  ];
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    const preview = await page.locator(".file-preview strong").textContent();
    const answer = clues.find(([clue]) => preview.includes(clue))?.[1];
    expect(answer).toBeTruthy();
    seen.add(answer);
    await page.locator('[data-action="context"]').click();
    await expect(page.locator("#attachment-feedback")).toContainText(
      "A reluctant clarification",
    );
    if (i === 0) {
      const wrong = page
        .locator('[data-action="roulette-choice"]')
        .filter({ hasNotText: answer })
        .first();
      await wrong.click();
      await expect(page.locator("#attachment-feedback")).toContainText(
        "No penalty",
      );
      await expect(page.locator(".attachment-reveal")).toHaveCount(0);
    }
    if (i === 2)
      await page.screenshot({ path: `${out}/attachments-desktop.png` });
    await page.getByRole("button", { name: answer, exact: true }).click();
    await expect(page.locator(".attachment-reveal")).toBeVisible();
    await page.locator('[data-action="roulette-next"]').click();
  }
  expect(seen.size).toBe(8);
  await expect(page.locator(".result-panel")).toContainText("7 / 8");
  check(
    "Every attachment is deducible from visible clues; free hints and unlimited retry work",
  );
  await home();
  await page.getByRole("button", { name: /Achievements/ }).click();
  await expect(page.locator(".achievement.unlocked")).toHaveCount(5);
  await page.screenshot({ path: `${out}/achievements.png` });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  check("Achievement persistence and gallery");
  const timings = await page.evaluate(async () => {
    const deltas = [];
    let prev = performance.now();
    return await new Promise((resolve) => {
      function step(t) {
        deltas.push(t - prev);
        prev = t;
        if (deltas.length < 90) requestAnimationFrame(step);
        else resolve(deltas.slice(5));
      }
      requestAnimationFrame(step);
    });
  });
  check(
    `Desktop animation sampled: ${Math.round(1000 / (timings.reduce((a, b) => a + b, 0) / timings.length))} FPS in headless Chrome`,
  );
  await page.evaluate(() =>
    localStorage.setItem("registrar.academic-chaos.v1", "{broken"),
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  check("Corrupt localStorage does not break startup");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  await mp.goto(base);
  await mp.screenshot({ path: `${out}/menu-mobile.png`, fullPage: true });
  expect(
    await mp.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  check("390px portrait menu has no horizontal overflow");
  await mp
    .getByRole("button", { name: "Run to your exam", exact: true })
    .click();
  await mp.getByRole("button", { name: "Let’s run", exact: true }).click();
  await mp.locator('[data-control="left"]').click();
  await expect(mp.locator("canvas")).toHaveAttribute("aria-label", /left lane/);
  const touch = await mobile.newCDPSession(mp);
  const swipe = async (x1, y1, x2, y2) => {
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: x1, y: y1 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x2, y: y2 }],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  await swipe(150, 420, 280, 425);
  await expect(mp.locator("canvas")).toHaveAttribute(
    "aria-label",
    /middle lane/,
  );
  await swipe(200, 480, 200, 300);
  await expect(mp.locator("canvas")).toHaveAttribute("aria-label", /jumping/);
  check("Mobile touch buttons and horizontal/vertical swipe handlers");
  await mp.screenshot({ path: `${out}/runner-portrait.png` });
  await mp.setViewportSize({ width: 844, height: 390 });
  await mp.waitForTimeout(200);
  await expect(mp.locator("[data-control=right]")).toBeVisible();
  await mp.screenshot({ path: `${out}/runner-landscape.png` });
  expect(
    await mp.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  check("Runner resizes to mobile landscape without horizontal overflow");
  await mp.getByRole("button", { name: "Main menu", exact: true }).click();
  await mp.setViewportSize({ width: 390, height: 844 });
  await mp.locator('[data-mode="simulator"]').click();
  await mp
    .getByRole("button", { name: "Report for duty", exact: true })
    .click();
  await mp.screenshot({ path: `${out}/office-mobile.png`, fullPage: true });
  await mp.locator('[data-action="office-choice"]').first().click();
  await expect(mp.locator(".decision-outcome")).toBeVisible();
  check("Mobile office layout and decision controls");
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  check(
    "No browser console errors, uncaught exceptions, or failed asset requests",
  );
  await writeFile(
    `${out}/browser-results.json`,
    JSON.stringify({ base, checks, errors, failed }, null, 2),
  );
} catch (e) {
  if (!page.isClosed())
    await page.screenshot({
      path: `${out}/browser-failure.png`,
      fullPage: true,
    });
  await writeFile(
    `${out}/browser-results.json`,
    JSON.stringify({ checks, errors, failed, error: String(e) }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
}
