import { expect, test } from '@playwright/test';
import { CAPABILITIES, type Capability } from '../src/lib/capabilities';
import { seedDevice } from './device';

/**
 * `requires` is the truth, not a comment.
 *
 * For each capability, the device is seeded with **exactly what it declares and nothing
 * more**, and then its control is operated. A capability that quietly needs something it
 * did not admit to fails here.
 *
 * This is the check that would have caught peer presence on the day it was written. It
 * declared no watch and needed one — it read its relay list from the Watchtower config, so
 * the feature built specifically for operators without a watch did nothing for them. It
 * passed every test, because no test had ever opened it with only an identity.
 */

/** A pubkey shaped correctly and belonging to nobody. */
const NOBODY = 'b'.repeat(64);

function seedFor(capability: Capability) {
  return {
    ...(capability.requires.includes('identity') ? { callsign: 'Wren' } : {}),
    ...(capability.requires.includes('watch')
      ? { watchtower: { pubkey: NOBODY, relays: ['wss://relay.example'] } }
      : {}),
    ...(capability.requires.includes('peers')
      ? { peers: [{ pubkey: NOBODY, callsign: 'Raven', since: 0 }] }
      : {})
  };
}

for (const capability of CAPABILITIES) {
  test(`${capability.name} works with only what it declares`, async ({ page }) => {
    await seedDevice(page, seedFor(capability));
    await page.goto(`/${capability.screen}`);

    // The screen renders at all. A capability whose page errors with its declared state is
    // not a capability.
    await expect(page.locator('h1')).toBeVisible();

    if (capability.control) {
      const control = page.locator(capability.control);
      await expect(control, `${capability.control} is not on ${capability.screen}`).toBeVisible();
      await expect(control, `${capability.control} is not operable`).toBeEnabled();
    }
  });
}

test('a capability that declares no watch does not quietly need one', async ({ page }) => {
  // Stated as one assertion over the whole set, because the failure it guards was not
  // specific to a screen -- it was a shared module reaching for the Watchtower config, and
  // every capability that touched it inherited the dependency.
  const withoutWatch = CAPABILITIES.filter((c) => !c.requires.includes('watch'));
  expect(withoutWatch.length).toBeGreaterThan(0);

  for (const capability of withoutWatch) {
    await seedDevice(page, seedFor(capability));
    await page.goto(`/${capability.screen}`);

    // Nothing on the page may tell an operator to go and get a Watchtower first.
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text, `${capability.name} demands a watch`).not.toContain('not configured');

    if (capability.control) {
      await expect(page.locator(capability.control)).toBeEnabled();
    }
  }
});
