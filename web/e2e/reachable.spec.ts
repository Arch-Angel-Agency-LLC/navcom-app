import { expect, test } from '@playwright/test';
import { readDevice, seedDevice, serviceWorkerReady, open } from './device';

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

test.describe('distress before the app has loaded', () => {
  /**
   * The gap the bundle budget was standing in for.
   *
   * Every terminal screen is readable in about half a second and wired seconds later — three
   * on a congested cell, ten on a throttled plan. On Distress that meant the page said "Hold
   * to send" and holding did nothing, with no working `tel:` link either.
   *
   * These block the module bundle entirely, which is the same state as "it has not arrived
   * yet" and is strictly harsher than any real network.
   */
  const withoutTheApp = async (page: import('@playwright/test').Page) => {
    await page.route('**/_app/immutable/**/*.js', (route) => route.abort());
  };

  test('the person you would call is reachable with no application at all', async ({ page }) => {
    await seedDevice(page, { ...OUT, contact: { label: 'Sam', number: '+15550100' } });
    await withoutTheApp(page);
    await page.goto('/terminal/distress/', { waitUntil: 'commit' });

    const text = page.getByRole('link', { name: /text sam/i });
    const call = page.getByRole('link', { name: /call sam/i });
    await expect(text).toBeVisible();
    await expect(call).toBeVisible();
    await expect(text).toHaveAttribute('href', 'sms:+15550100');
    await expect(call).toHaveAttribute('href', 'tel:+15550100');
  });

  test('says nothing at all when there is no contact to offer', async ({ page }) => {
    // An empty "Your person" heading would be worse than no heading: it reads as a safety
    // net that exists and is broken, rather than one that was never set up.
    await seedDevice(page, OUT);
    await withoutTheApp(page);
    await page.goto('/terminal/distress/', { waitUntil: 'commit' });

    await expect(page.getByRole('heading', { name: /your person/i })).toHaveCount(0);
  });

  test('does not survive as a duplicate once the app is running', async ({ page }) => {
    // Two "Text Sam" links would be the fallback outliving its purpose. Svelte's version
    // carries the written message; this one is deliberately plainer.
    await seedDevice(page, { ...OUT, contact: { label: 'Sam', number: '+15550100' } });
    await open(page, '/terminal/distress/');

    await expect(page.getByRole('link', { name: /text sam/i })).toHaveCount(1);
    await expect(page.locator('#reach-early')).toHaveCount(0);
    // And the surviving one is the app's, which pre-writes the message.
    await expect(page.getByRole('link', { name: /text sam/i })).toHaveAttribute('href', /body=/);
  });

  test('a broken or foreign storage blob does not take the page down', async ({ page }) => {
    // A fallback that throws would break the screen it exists to protect.
    await page.addInitScript(() => localStorage.setItem('navcom.accruing', 'not json'));
    await withoutTheApp(page);
    await page.goto('/terminal/distress/', { waitUntil: 'commit' });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('heading', { name: /your person/i })).toHaveCount(0);
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

test.describe('holding the watch', () => {
  test('a watch can be started on this phone, and taking it is a separate act', async ({ page }) => {
    // Starting a watch and being ON it are different. A key on the device promises nothing;
    // publishing that a named human is watching is the promise.
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');

    await page.getByRole('button', { name: /start a watch on this phone/i }).click();
    await expect(page.getByRole('heading', { name: /off watch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /take the watch/i })).toBeVisible();
  });

  test('the watch key is its own key, not the operator identity', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');
    await page.getByRole('button', { name: /start a watch on this phone/i }).click();

    const device = await readDevice(page);
    expect(device.accruing['watch_secret']).toBeTruthy();
    expect(device.accruing['watch_secret']).not.toBe(device.accruing['secret']);
  });

  test('a key that is not a key is refused with a reason', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');

    await page.locator('#key').fill('nonsense');
    await page.getByRole('button', { name: /^join$/i }).click();
    await expect(page.getByText(/not a watch key/i)).toBeVisible();
  });

  test('giving up the watch takes a second deliberate tap and says what it does not do', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');
    await page.getByRole('button', { name: /start a watch on this phone/i }).click();

    // The limit stated before the button, not after: other holders keep the same key and
    // nothing here can reach their devices.
    //
    // `\s+` rather than a space: getByText does not normalise whitespace when given a
    // regex, and this phrase spans a line break in the markup. A literal space here fails
    // for a formatting reason that has nothing to do with what is being asserted.
    await expect(page.getByText(/it does not end the\s+watch/i)).toBeVisible();

    await page.getByRole('button', { name: /give up this watch/i }).click();
    await page.getByRole('button', { name: /remove it from this phone/i }).click();

    const device = await readDevice(page);
    expect(device.accruing['watch_secret']).toBeUndefined();
    // Giving up a watch is not leaving. The operator identity is untouched.
    expect(device.accruing['secret']).toBeTruthy();
  });

  test('there is no control anywhere that closes a Distress', async ({ page }) => {
    // Invariant 2: a Distress terminates in a human. A watch screen that could clear one
    // would let it terminate in a tap instead.
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');
    await page.getByRole('button', { name: /start a watch on this phone/i }).click();

    for (const name of [/close/i, /resolve/i, /clear/i, /dismiss/i, /stand.*down.*distress/i]) {
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
  });
});

test.describe('saying no to an assist', () => {
  test('the operator is told a refusal is possible before they send', async ({ page }) => {
    // It changes whether somebody sends an assist at all, or goes straight to their own
    // person -- so it cannot wait until a refusal arrives.
    await seedDevice(page, { ...OUT, watchtower: { pubkey: 'e'.repeat(64), relays: ['wss://relay.example'] } });
    await open(page, '/terminal/assist/');

    await expect(page.getByText(/will say so/i)).toBeVisible();
  });

  test('no control offers to decline a Distress', async ({ page }) => {
    // Invariant 2. The rule lives in core so every client inherits it, and this checks the
    // one surface that could offer the button anyway.
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');
    await page.getByRole('button', { name: /start a watch on this phone/i }).click();

    await expect(page.getByRole('button', { name: /nobody can come/i })).toHaveCount(0);
  });
});

test.describe('post-quantum cover', () => {
  test('says so, calmly, when a message goes without it', async ({ page }) => {
    // State-dependent on purpose: showing this while cover IS hybrid would be a lie. A peer
    // with no cached key is exactly the fallback the policy allows.
    await seedDevice(page, { ...OUT, peers: [{ pubkey: 'f'.repeat(64), callsign: 'Raven', since: 0 }] });
    await open(page, '/terminal/');

    const notice = page.getByText(/standard encryption tonight/i);
    await expect(notice).toBeVisible();
    // What is missing, and what is not.
    await expect(page.getByText(/unreadable by anyone now/i)).toBeVisible();
    await expect(page.getByText(/open the app once/i)).toBeVisible();
  });

  test('is a note, not an alarm', async ({ page }) => {
    // The whole point of the wording decision. An orange bar saying "insecure" would be
    // alarming and also wrong -- the message is encrypted and nobody can read it today.
    await seedDevice(page, { ...OUT, peers: [{ pubkey: 'f'.repeat(64), callsign: 'Raven', since: 0 }] });
    await open(page, '/terminal/');

    const body = (await page.locator('body').innerText()).toLowerCase();
    for (const word of ['insecure', 'unsafe', 'danger', 'vulnerable', 'at risk']) {
      expect(body, word).not.toContain(word);
    }

    // Rendered in the same muted colour as every other cost on the screen, not an alert one.
    const colour = await page
      .getByText(/standard encryption tonight/i)
      .evaluate((el) => getComputedStyle(el).color);
    const alarm = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--t-alarm').trim()
    );
    expect(colour).not.toBe(alarm);
  });
});

test.describe('being on call', () => {
  test('the sender key is pasted in, because nothing discovers it', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, '/terminal/on-call/');

    await expect(page.locator('#sender')).toBeVisible();
    await expect(page.getByRole('button', { name: /let this device be woken/i })).toBeDisabled();
    await page.locator('#sender').fill('x');
    await expect(page.getByRole('button', { name: /let this device be woken/i })).toBeEnabled();
  });

  test('a key that is not a key is refused before anything is asked for', async ({ page }) => {
    // The permission prompt is the expensive part -- an operator who is prompted and then
    // told the key was wrong has been interrupted for nothing.
    await seedDevice(page, OUT);
    await open(page, '/terminal/on-call/');

    await page.locator('#sender').fill('nonsense');
    await page.getByRole('button', { name: /let this device be woken/i }).click();
    await expect(page.getByText(/sender key is 65 bytes|does not look like a sender key/i)).toBeVisible();
  });

  test('says this is the only notification the app sends', async ({ page }) => {
    // The rule the rest of the app is built on, stated on its one exception.
    await seedDevice(page, OUT);
    await open(page, '/terminal/on-call/');

    await expect(page.getByText(/only notification navcom ever sends/i)).toBeVisible();
    await expect(page.getByText(/field terminal is silent/i)).toBeVisible();
  });
});

test.describe('resupply', () => {
  const WATCHED = { ...OUT, watchtower: { pubkey: 'e'.repeat(64), relays: ['wss://relay.example'] } };

  test('says plainly that nothing counts what you handed out', async ({ page }) => {
    // The decision, stated where somebody would otherwise expect a tally.
    await seedDevice(page, WATCHED);
    await open(page, '/terminal/resupply/');

    await expect(page.getByText(/nothing counts what you handed out/i)).toBeVisible();
    await expect(page.getByText(/a request, not a report/i)).toBeVisible();
  });

  test('guides away from writing about a person', async ({ page }) => {
    await seedDevice(page, WATCHED);
    await open(page, '/terminal/resupply/');
    await expect(page.getByText(/write about the supply, not the person/i)).toBeVisible();
  });

  test('an operator with no watch is told nothing is missing', async ({ page }) => {
    // Somebody patrolling alone has no quartermaster either. This must not read as
    // incomplete setup.
    await seedDevice(page, OUT);
    await open(page, '/terminal/resupply/');
    await expect(page.getByText(/nothing here is missing/i)).toBeVisible();
  });

  test('the restock list on the watch is separate from what people are waiting on', async ({ page }) => {
    // Putting it in "Waiting on you" would make it compete with "I need someone" -- the
    // alarm-fatigue problem in a quieter dress.
    await seedDevice(page, OUT);
    await open(page, '/terminal/watch/');
    await page.getByRole('button', { name: /start a watch on this phone/i }).click();

    await expect(page.getByRole('heading', { name: /^restock$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /waiting on you/i })).toBeVisible();
    await expect(page.getByText(/nothing has run out/i)).toBeVisible();
  });
});

test.describe('reporting a problem with a record', () => {
  const AREA = '/terminal/directory/st-louis/';

  test('says what a report can and cannot do, before anybody makes one', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, AREA);

    await expect(page.getByText(/cannot delete this listing or\s+overrule anybody/i)).toBeVisible();
    await expect(page.getByText(/nobody has to approve it/i)).toBeVisible();
  });

  test('is one tap from the record, with no form and no account', async ({ page }) => {
    // Display rule 4: "reporting must always be easier than fixing". Until now the app could
    // render a flag and not set one, so reporting was impossible while fixing needed a pull
    // request.
    await seedDevice(page, OUT);
    await open(page, AREA);

    await page.getByRole('button', { name: /report a problem/i }).first().click();
    await expect(page.getByRole('button', { name: /^closed$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^wrong$/i }).first()).toBeVisible();
  });

  test('a report adds a note and never removes the listing', async ({ page }) => {
    // The abuse answer, end to end. Nobody adjudicates between operators, so the shape of
    // the data has to be what makes a hostile report survivable.
    await seedDevice(page, OUT);
    await open(page, AREA);

    const before = await page.locator('[data-record]').count();
    await page.getByRole('button', { name: /report a problem/i }).first().click();
    await page.getByRole('button', { name: /^closed$/i }).first().click();

    await expect(page.locator('[data-report]').first()).toBeVisible();
    await expect(page.locator('[data-report]').first()).toContainText(/reported this/i);
    // The listing is still there, and still says so.
    expect(await page.locator('[data-record]').count()).toBe(before);
    await expect(page.getByText(/the published listing is still underneath/i).first()).toBeVisible();
  });

  test('says what nobody knows, so contributing is an errand rather than an audit', async ({ page }) => {
    // "Contribute something" asks an operator to audit a database. "You are there, ask them
    // one thing" gets done. The schema already knows which fields are blank.
    await seedDevice(page, OUT);
    await open(page, AREA);

    const asks = page.locator('[data-asks]').first();
    await expect(asks).toBeVisible();
    await expect(asks).toContainText(/nobody knows/i);
    await expect(asks).toContainText(/if you are there, ask/i);
  });

  test('stops asking once somebody has answered', async ({ page }) => {
    // Continuing to ask is how a contribution list becomes noise.
    await seedDevice(page, OUT);
    await open(page, AREA);

    const first = page.locator('[data-record]').first();
    const before = await first.locator('[data-asks]').innerText();
    // Correct the first thing it asked about.
    await first.getByRole('button', { name: /report a problem/i }).click();
    await first.getByRole('button', { name: /^intake$/i }).click();
    await first.locator('input.fix').fill('19:00-20:30');
    await first.getByRole('button', { name: /^send$/i }).click();

    await expect(first.locator('[data-asks]')).not.toHaveText(before);
  });

  test('most corrections are a tap, because the schema is enums', async ({ page }) => {
    // The difference between a correction made standing outside in the cold and one meant
    // for later that never happens.
    await seedDevice(page, OUT);
    await open(page, AREA);

    const first = page.locator('[data-record]').first();
    await first.getByRole('button', { name: /report a problem/i }).click();
    await first.getByRole('button', { name: /^pets$/i }).click();
    // Options, not a text box.
    await expect(first.locator('input.fix')).toHaveCount(0);
    // Options rendered as buttons, whatever the schema calls them.
    await expect(first.getByRole('button', { name: /^no$/i })).toBeVisible();
  });

  test('guides away from writing about a person, only where text is possible', async ({ page }) => {
    await seedDevice(page, OUT);
    await open(page, AREA);

    const first = page.locator('[data-record]').first();
    await first.getByRole('button', { name: /report a problem/i }).click();
    await first.getByRole('button', { name: /^open$/i }).click();
    await expect(first.getByText(/write about the place, not the person/i)).toBeVisible();
  });

  test('a report survives losing the network, because the directory does', async ({ page, context }) => {
    await seedDevice(page, OUT);
    await open(page, AREA);
    // Nothing is served offline until the worker is actually running.
    await serviceWorkerReady(page);
    await page.getByRole('button', { name: /report a problem/i }).first().click();
    await page.getByRole('button', { name: /^closed$/i }).first().click();
    await expect(page.locator('[data-report]').first()).toBeVisible();

    // The region page is cached ON VISIT, not precached -- "only what you open is kept" --
    // so cutting the network before the worker has it tests the race rather than the
    // feature. Same wait the offline spec uses.
    await page.waitForFunction(async () => {
      for (const name of await caches.keys()) {
        if (await (await caches.open(name)).match('/terminal/directory/st-louis/')) return true;
      }
      return false;
    }, undefined, { timeout: 15_000 });

    await context.setOffline(true);
    // Reload rather than navigate, which is the pattern offline.spec.ts already proves: a
    // fresh `goto` offline has to re-resolve the whole route, and what this test is about is
    // whether the correction survived, not whether routing does.
    await page.reload();
    await page.waitForSelector('html[data-hydrated="true"]', { timeout: 20_000 });
    await expect(page.locator('[data-report]').first()).toBeVisible();
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
