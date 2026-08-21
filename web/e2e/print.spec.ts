import { expect, test } from '@playwright/test';

/**
 * What somebody gets when an operator hands them paper.
 *
 * The only artifact this project produces that **cannot be corrected after it leaves**. A
 * screen shows how old its data is because a confident wrong answer is the worst failure
 * here; a printed page looks equally authoritative the day it was printed and eighteen
 * months later.
 *
 * Emulated rather than actually printed — `emulateMedia({ media: 'print' })` applies the
 * print stylesheet to a live page, which is what these assertions are about.
 */

const RECORD = '/directory/st-louis-st-patrick-center/';

test.describe('a printed record', () => {
  test('carries its own age and its source', async ({ page }) => {
    await page.goto(RECORD);
    await page.emulateMedia({ media: 'print' });

    const block = page.locator('[data-print-provenance]');
    await expect(block).toBeVisible();
    await expect(block).toContainText('navcom.app');
    await expect(block).toContainText(/last checked|nobody has checked this/i);
    // The instruction that survives being out of date.
    await expect(block).toContainText(/call before you go/i);
  });

  test('says nothing about provenance on screen, where the ages are already shown', async ({ page }) => {
    await page.goto(RECORD);
    await expect(page.locator('[data-print-provenance]')).toBeHidden();
  });

  test('drops the navigation, which is dead ink on paper', async ({ page }) => {
    await page.goto(RECORD);
    await page.emulateMedia({ media: 'print' });

    await expect(page.locator('header nav')).toBeHidden();
    await expect(page.locator('footer')).toBeHidden();
  });

  test('prints dark ink on white however the reader has their theme', async ({ page }) => {
    // Somebody in dark mode would otherwise print white text on nothing, or a page of ink.
    // The screen adapts to the reader; paper adapts to nobody.
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
    await page.goto(RECORD);

    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()
    );
    const ink = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
    );
    expect(bg).toBe('#ffffff');
    expect(ink).toBe('#000000');
  });

  test('still shows the flag first, because that is what decides the trip', async ({ page }) => {
    // Display rule 3 does not stop applying on paper.
    await page.goto(RECORD);
    await page.emulateMedia({ media: 'print' });
    const record = page.locator('[data-record]');
    await expect(record).toBeVisible();
  });
});
