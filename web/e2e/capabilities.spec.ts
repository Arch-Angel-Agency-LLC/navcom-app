import { expect, test } from '@playwright/test';
import { CAPABILITIES, type Capability } from '../src/lib/capabilities';
import { seedDevice, open } from './device';

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
    await open(page, `/${capability.screen}`);

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

test('a capability that declares no watch does not quietly need one', async ({ browser }) => {
  // One test, one fresh browser context per capability, and there are now seventeen. That
  // is a minute of real work under parallel load and it outgrew the default 30s timeout as
  // the manifest filled up -- surfacing as a flake rather than as "this test got bigger".
  // Scaled off the manifest so it keeps up on its own.
  test.setTimeout(20_000 + CAPABILITIES.length * 8_000);

  // Stated as one assertion over the whole set, because the failure it guards was not
  // specific to a screen -- it was a shared module reaching for the Watchtower config, and
  // every capability that touched it inherited the dependency.
  //
  // **A fresh context per capability**, which this did not have until the card screen
  // exposed it. `seedDevice` deliberately seeds once and then leaves the device alone, so
  // reusing one page meant every iteration after the first ran against the *first*
  // capability's state -- an empty device. It was quietly asserting "works with no setup at
  // all", which is a different and much weaker claim than the one in its name. Screens that
  // happen not to gate on identity passed it for the wrong reason.
  const withoutWatch = CAPABILITIES.filter((c) => !c.requires.includes('watch'));
  expect(withoutWatch.length).toBeGreaterThan(0);

  for (const capability of withoutWatch) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await seedDevice(page, seedFor(capability));
      await open(page, `/${capability.screen}`);

      // Nothing on the page may tell an operator to go and get a Watchtower first.
      const text = (await page.locator('body').innerText()).toLowerCase();
      expect(text, `${capability.name} demands a watch`).not.toContain('not configured');

      if (capability.control) {
        await expect(
          page.locator(capability.control),
          `${capability.name}: ${capability.control} is not operable without a watch`
        ).toBeEnabled();
      }
    } finally {
      await context.close();
    }
  }
});
