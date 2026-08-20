import { expect, test } from '@playwright/test';
import { readDevice, seedDevice, open } from './device';

/**
 * Every control an operator is told about is on the screen and operable.
 *
 * This is the file that would have caught the position control. It was fully wired — the
 * module existed, the setting was imported, `setPrecision` ran on every sign-on — and the
 * `<select>` was simply not on the page, because one string in an edit did not match. 113
 * tests passed. Signing on quietly reset a setting the operator had no way to set.
 *
 * **A mechanism nobody can reach is not built**, and until this file existed nothing said so.
 */

const OUT = { callsign: 'Wren' };

test.describe('setup', () => {
  test('a first visit can create an identity and nothing else is required', async ({ page }) => {
    await seedDevice(page);
    await open(page, '/terminal/setup/');

    await expect(page.locator('#callsign')).toBeVisible();
    await expect(page.getByRole('button', { name: /generate keypair/i })).toBeEnabled();

    // The watch section must read as optional. An operator who knows nobody is the common
    // case, and telling them setup is unfinished is telling them the app is broken.
    await expect(page.getByText(/skip this/i)).toBeVisible();
  });

  test('somebody you would call can be added and removed', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/setup/');

    await page.locator('#clabel').fill('Sam');
    await page.locator('#cnumber').fill('+1 555 0100');
    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByText('+1 555 0100')).toBeVisible();
    await page.getByRole('button', { name: /remove/i }).click();
    await expect(page.getByText('+1 555 0100')).toHaveCount(0);
  });
});

test.describe('a squad-held watch', () => {
  test('who holds it can be listed, and is empty by default', async ({ page }) => {
    // Empty is the common case: a box holds its own key. The field exists because a squad
    // with no box is the arrangement this project expects most, and until now it had no
    // way to say so.
    await seedDevice(page, OUT);
    await open(page, '/terminal/setup/');

    const holders = page.locator('#holders');
    await expect(holders).toBeVisible();
    await expect(holders).toHaveValue('');
  });

  test('a key that is not a key is refused rather than silently dropped', async ({ page }) => {
    // A wrong entry here means somebody silently cannot read signals, which surfaces as an
    // unanswered Distress rather than as an error.
    await seedDevice(page, OUT);
    await open(page, '/terminal/setup/');

    await page.locator('#pubkey').fill('b'.repeat(64));
    await page.locator('#holders').fill('not-a-key');
    await page.getByRole('button', { name: /^connect$/i }).click();

    await expect(page.getByText(/is not a pubkey/i)).toBeVisible();
  });

  test('holders are saved and read back', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/setup/');

    const one = 'c'.repeat(64);
    const two = 'd'.repeat(64);
    await page.locator('#pubkey').fill('b'.repeat(64));
    await page.locator('#holders').fill(`${one}\n${two}`);
    await page.getByRole('button', { name: /^connect$/i }).click();

    const device = await readDevice(page);
    expect(device.accruing['watch_holders']).toEqual([one, two]);
  });
});

test.describe('sign-on', () => {
  test('every choice an operator makes is on the page', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/sign-on/');

    await expect(page.locator('#area')).toBeVisible();
    await expect(page.locator('#hours')).toBeVisible();
    await expect(page.locator('#routine')).toBeVisible();
    // The one that shipped missing.
    await expect(page.locator('#share')).toBeVisible();
  });

  test('position sharing offers off, coarse and exact, and nothing public', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/sign-on/');

    const values = await page.locator('#share option').evaluateAll((els) =>
      els.map((e) => (e as HTMLOptionElement).value)
    );
    expect(values).toEqual(['off', 'coarse', 'exact']);
    // Not "do not add a public option" — there must be nowhere to put one.
    expect(values).not.toContain('network');
    expect(values).not.toContain('public');
  });

  test('signing on is refused without an area, since it travels with a Distress', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/sign-on/');
    await expect(page.getByRole('button', { name: /sign on/i })).toBeDisabled();
    await page.locator('#area').fill('Downtown');
    await expect(page.getByRole('button', { name: /sign on/i })).toBeEnabled();
  });
});

test.describe('distress', () => {
  test('the hold control is present and never disabled', async ({ page }) => {
    // A prerendered page must render some default and both are wrong: armed briefly
    // promises what it cannot do, disarmed briefly REFUSES a real emergency during
    // hydration. So the press always registers.
    await seedDevice(page, OUT);
    await open(page, '/terminal/distress/');

    const hold = page.locator('button.raise');
    await expect(hold).toBeVisible();
    await expect(hold).toBeEnabled();
  });

  test('your own person is offered first, above everything', async ({ page }) => {
    await seedDevice(page, { ...OUT, contact: { label: 'Sam', number: '+15550100' } });
    await open(page, '/terminal/distress/');

    const text = page.getByRole('link', { name: /text sam/i });
    const call = page.getByRole('link', { name: /call sam/i });
    await expect(text).toBeVisible();
    await expect(call).toBeVisible();

    // Opens the messaging app with it written. The operator still presses send, and the
    // page says so — a web app cannot do that for them.
    await expect(text).toHaveAttribute('href', /^sms:/);
    await expect(call).toHaveAttribute('href', /^tel:/);
  });
});

test.describe('wipe', () => {
  test('panic wipe is a hold and burn asks for the callsign', async ({ page }) => {
    // Opposite shapes on purpose: a wipe costs an evening and speed wins; a burn costs
    // everything and nothing about seizure makes typing impossible.
    await seedDevice(page, OUT);
    await open(page, '/terminal/wipe/');

    await expect(page.getByRole('button', { name: /hold to wipe tonight/i })).toBeVisible();

    const burn = page.getByRole('button', { name: /burn this device/i });
    await expect(burn).toBeDisabled();
    await page.locator('#confirm').fill('Wren');
    await expect(burn).toBeEnabled();
  });

  test('the wrong callsign does not arm the burn', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/wipe/');
    await page.locator('#confirm').fill('wren');
    await expect(page.getByRole('button', { name: /burn this device/i })).toBeDisabled();
  });
});

test.describe('peers', () => {
  test('your code is shown as something scannable', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/peers/');

    const qr = page.locator('[data-qr] svg');
    await expect(qr).toBeVisible();
  });

  test('pairing needs a code and a name for them', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/peers/');

    await page.locator('#code').fill('b'.repeat(64));
    await page.locator('#name').fill('Raven');
    await page.getByRole('button', { name: /^pair$/i }).click();

    await expect(page.getByText('Raven')).toBeVisible();
    await expect(page.getByRole('button', { name: /remove/i })).toBeVisible();
  });

  test('a bad code is refused with a reason rather than ignored', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/peers/');

    await page.locator('#code').fill('not-a-code');
    await page.locator('#name').fill('Raven');
    await page.getByRole('button', { name: /^pair$/i }).click();

    await expect(page.getByText(/not a navcom code/i)).toBeVisible();
  });
});

test.describe('watching for somebody', () => {
  test('is taken on and put down in one tap, from the peer list', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/peers/');

    await page.locator('#code').fill('b'.repeat(64));
    await page.locator('#name').fill('Raven');
    await page.getByRole('button', { name: /^pair$/i }).click();

    // Pairing alone does not make you responsible for anybody.
    await expect(page.getByText('watching', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: /watch for them/i }).click();
    await expect(page.getByText('watching', { exact: true })).toBeVisible();

    // Putting it down is as unceremonious as taking it up. Somebody who has to justify
    // stopping keeps a commitment they cannot keep, which is worse for the person relying
    // on it than an honest end.
    await page.getByRole('button', { name: /stop watching/i }).click();
    await expect(page.getByText('watching', { exact: true })).toHaveCount(0);
  });
});

test.describe('your card', () => {
  test('publishing needs an area chosen deliberately', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/card/');

    const publish = page.getByRole('button', { name: /publish your card/i });
    await expect(publish).toBeDisabled();
    await page.locator('#region').selectOption('st-louis');
    await expect(publish).toBeEnabled();
  });

  test('there is nothing to withdraw and nothing to list until a card exists', async ({ page }) => {
    // Being listed as out is meaningless without a card to resolve the name against, and a
    // switch you can arm before it does anything is a switch that will be on by surprise.
    await seedDevice(page, OUT);
    await open(page, '/terminal/card/');

    await expect(page.getByRole('button', { name: /withdraw my card/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /not listed|listed while out/i })).toHaveCount(0);
  });

  test('publishing is offered, and withdrawing takes a second deliberate tap', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/card/');

    await page.locator('#region').selectOption('st-louis');
    await page.getByRole('button', { name: /publish your card/i }).click();

    // Stored on this device even though no relay could be reached -- the card is the
    // operator's, not the network's.
    await expect(page.getByRole('button', { name: /replace your card/i })).toBeVisible();

    // Off by default. Publishing a card must not sign anybody up to being listed nightly.
    await expect(page.getByRole('button', { name: /^not listed$/i })).toBeVisible();

    await page.getByRole('button', { name: /withdraw my card/i }).click();
    await expect(page.getByRole('button', { name: /throw the key away/i })).toBeVisible();
    await page.getByRole('button', { name: /keep my card/i }).click();
    await expect(page.getByRole('button', { name: /replace your card/i })).toBeVisible();
  });

  test('withdrawing discards the key rather than claiming to unpublish', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/card/');
    await page.locator('#region').selectOption('st-louis');
    await page.getByRole('button', { name: /publish your card/i }).click();

    const before = await readDevice(page);
    expect(before.accruing['contact_secret'], 'a card has a key of its own').toBeTruthy();
    expect(before.accruing['contact_secret']).not.toBe(before.accruing['secret']);

    await page.getByRole('button', { name: /withdraw my card/i }).click();
    await page.getByRole('button', { name: /throw the key away/i }).click();

    const after = await readDevice(page);
    expect(after.accruing['contact_secret']).toBeUndefined();
    expect(after.accruing['card']).toBeUndefined();
    // The operational identity is untouched. Withdrawing a card is not leaving.
    expect(after.accruing['secret']).toBe(before.accruing['secret']);
  });
});

test.describe('finding somebody', () => {
  test('an area is chosen, and nothing is shown until one is', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/find/');

    await expect(page.locator('#area')).toBeVisible();
    await expect(page.locator('.board')).toHaveCount(0);
  });

  test('an empty area says so rather than looking broken', async ({ page }) => {
    // The ordinary case early on, and in most metros for a long time. It is not an error.
    await seedDevice(page, OUT);
    await open(page, '/terminal/find/');
    await page.locator('#area').selectOption('st-louis');

    await expect(page.getByText(/nobody has published a card here/i)).toBeVisible();
  });
});

test.describe('patrols', () => {
  test('whether the history survives a wipe is a control, not a setting somebody has to find', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/patrols/');

    const toggle = page.getByRole('button', { name: /panic wipe/i });
    await expect(toggle).toBeVisible();

    // Off by default: the Protest Medic needs a phone that is useless to whoever takes it.
    await expect(page.getByText(/are destroyed by a panic wipe/i)).toBeVisible();
    await toggle.click();
    await expect(page.getByText(/survive a panic wipe/i)).toBeVisible();
  });
});
