import { expect, test } from '@playwright/test';
import { seedDevice, serviceWorkerReady } from './device';

/**
 * With the network off.
 *
 * Three things claim to work here — the cached directory, the patrol record, and the
 * terminal itself — and until this file existed **none of them had ever been tested with
 * the network down.** Two of them shipped without being cached at all, which the tests did
 * not notice because the tests read files from `build/`, and `build/` is always there.
 *
 * The sequencing matters more than it looks: the service worker has to reach `activated`
 * before going offline. Cutting the network first tests a page still being served from it,
 * and passes.
 */

const WREN = { callsign: 'Wren' };

test.describe.configure({ mode: 'serial' });

test('every terminal screen loads with the network off', async ({ page, context }) => {
  await seedDevice(page, WREN);

  // Install and activate, online.
  await page.goto('/terminal/');
  await serviceWorkerReady(page);

  await context.setOffline(true);

  // The list is the one the service worker precaches, and a test elsewhere asserts that
  // list matches what was actually built — so this covers every screen without naming them
  // twice.
  for (const route of ['', 'sign-on/', 'query/', 'assist/', 'distress/', 'patrols/', 'peers/', 'wipe/', 'log/', 'setup/']) {
    const response = await page.goto(`/terminal/${route}`);
    expect(response?.status(), `/terminal/${route} offline`).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('the cached directory is readable with no signal', async ({ page, context }) => {
  await seedDevice(page, WREN);

  // Opening an area is what saves it — there is no download button because visiting the
  // page IS the download.
  await page.goto('/terminal/directory/');
  await serviceWorkerReady(page);

  // Tapping through, which is how anybody actually gets here — and is a client-side
  // navigation that fetches this page's data and never its HTML. The page asks the worker
  // to save the document; this waits for that to land before cutting the network, because
  // testing the race would just make the test flaky rather than the app correct.
  await page.getByRole('link', { name: /st\. louis/i }).click();
  await expect(page.locator('[data-record]').first()).toBeVisible();
  await page.waitForFunction(async () => {
    for (const name of await caches.keys()) {
      const hit = await (await caches.open(name)).match('/terminal/directory/st-louis/');
      if (hit) return true;
    }
    return false;
  }, undefined, { timeout: 10_000 });

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('[data-record]').first()).toBeVisible();
  await expect(page.locator('[data-snapshot-age]')).toBeVisible();
});

test('an area never opened is not silently empty', async ({ page, context }) => {
  // Only what you open is kept, so an area you never visited genuinely is not there. What
  // matters is that it fails visibly rather than rendering an empty directory, which would
  // read as "nothing here" instead of "you do not have this".
  await seedDevice(page, WREN);
  await page.goto('/terminal/');
  await serviceWorkerReady(page);

  await context.setOffline(true);
  const response = await page.goto('/terminal/directory/london/');

  if (response && response.status() < 400) {
    // If it did come from cache, it must have real records rather than an empty shell.
    await expect(page.locator('[data-record]').first()).toBeVisible();
  } else {
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  }
});

test('a patrol can be recorded and read back with no network', async ({ page, context }) => {
  // The patrol record says in as many words that it works with no signal. It shipped
  // without being cached, so it did not.
  await seedDevice(page, WREN);
  await page.goto('/terminal/');
  await serviceWorkerReady(page);

  await context.setOffline(true);

  await page.goto('/terminal/sign-on/');
  await page.locator('#area').fill('Downtown');
  await page.getByRole('button', { name: /sign on/i }).click();
  await expect(page.locator('[data-station]')).toBeVisible();

  await page.getByRole('button', { name: /stand down/i }).click();
  await page.getByRole('button', { name: /i'm home/i }).click();
  await expect(page.locator('[data-came-home]')).toBeVisible();

  await page.goto('/terminal/patrols/');
  await expect(page.getByText('Downtown')).toBeVisible();
});
