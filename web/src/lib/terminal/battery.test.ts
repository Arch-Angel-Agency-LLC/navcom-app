/**
 * The battery reading stays on the phone.
 *
 * The useful-sounding version of this feature publishes a level on the heartbeat, so a peer
 * can tell "their phone died" from "something happened". These tests exist because that
 * version is one small edit away and would be a reasonable-looking thing to add.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPresence, buildSignal, watchtowerAt } from '@navcom/core';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { battery, LOW_PERCENT } from './battery.svelte';

const src = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8');

describe('nothing sends it', () => {
  it('is absent from the peer presence payload', () => {
    // Publishing it makes silence interpretable, and the inference runs both ways: quiet at
    // 6% reads as a flat battery, quiet at 90% reads as something wrong. The second is a
    // conclusion drawn from an absence [invariant 3].
    const me = generateSecretKey();
    const peer = getPublicKey(generateSecretKey());
    const [event] = buildPresence(
      me,
      [peer],
      { callsign: 'Wren', status: 'out', area: 'Downtown', until: 1_755_300_000 },
      1_755_300_000
    );
    expect(JSON.stringify(event)).not.toMatch(/batt|charg|power/i);
  });

  it('is absent from a signal to the watch', () => {
    const me = generateSecretKey();
    const to = watchtowerAt(getPublicKey(generateSecretKey()));
    const event = buildSignal(me, to, 'routine', {}, 1_755_300_000);
    expect(JSON.stringify(event)).not.toMatch(/batt|charg|power/i);
  });

  it('is imported by nothing that sends', () => {
    // Source-level, because the two tests above only prove that the payloads which exist
    // today carry no battery field. This catches somebody wiring it into a sender.
    //
    // Matched on the import specifically, not on the word: `presence.svelte.ts` says "flat
    // battery" in a comment about what silence looks like, and a test that fails on prose
    // is a test people delete.
    for (const sender of ['presence.svelte.ts', 'session.svelte.ts', 'public.svelte.ts']) {
      expect(src(sender), sender).not.toMatch(/from '\.\/battery\.svelte'/);
    }
  });
});

describe('what it says and does not say', () => {
  it('warns early enough to be actionable', () => {
    // A number you can still do something about -- tell somebody, head back, find a
    // charger. A warning at 2% is an announcement, not a warning.
    expect(LOW_PERCENT).toBeGreaterThanOrEqual(10);
    expect(LOW_PERCENT).toBeLessThanOrEqual(25);
  });

  it('reads nothing, and claims nothing, where the browser has no such API', async () => {
    // The Battery Status API is Chromium-only: Firefox removed it as a fingerprinting
    // vector and Safari never shipped it, so this is absent on iOS. Absent is correct --
    // nothing here estimates, and no screen shows a reading that is a guess.
    //
    // Node has a `navigator` and no `getBattery`, which is exactly the iOS shape.
    expect((navigator as unknown as Record<string, unknown>).getBattery).toBeUndefined();
    await battery.start();

    expect(battery.percent).toBeNull();
    // And `low` must be false rather than throwing or defaulting to alarming -- an absent
    // reading is not a low one.
    expect(battery.low).toBe(false);
  });
});
