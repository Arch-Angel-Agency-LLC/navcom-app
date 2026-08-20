/**
 * Reading a code somebody pasted or scanned.
 *
 * The extraction is the part worth testing: people paste from messaging apps, and what
 * arrives has quotation marks, link previews and stray words around it.
 */

import { describe, expect, it } from 'vitest';
import { canScan, pubkeyFrom } from './scan';

const key = 'a1b2c3d4'.repeat(8);

describe('finding a code in whatever arrived', () => {
  it('reads a bare code', () => {
    expect(pubkeyFrom(key)).toBe(key);
  });

  it('reads one out of a pairing link', () => {
    expect(pubkeyFrom(`https://navcom.app/terminal/peers/#${key}`)).toBe(key);
  });

  it('reads one out of the mess a messaging app pastes', () => {
    // Nobody pastes cleanly. Refusing this would send people back to retyping hex.
    expect(pubkeyFrom(`Raven: "here's mine" https://navcom.app/terminal/peers/#${key} 👍`)).toBe(key);
    expect(pubkeyFrom(`  ${key.toUpperCase()}  `)).toBe(key);
  });

  it('refuses anything that is not one', () => {
    for (const bad of ['', 'raven', 'a'.repeat(63), 'not a key at all']) {
      expect(pubkeyFrom(bad), bad).toBeNull();
    }
  });

  it('refuses a string of the right length that is not hex', () => {
    expect(pubkeyFrom('z'.repeat(64))).toBeNull();
  });
});

describe('whether a camera is offered at all', () => {
  it('says no when the browser has no detector', () => {
    // A camera button that does nothing is worse than no button: it teaches an operator
    // the app is broken at the moment they are trying to trust it.
    delete (globalThis as Record<string, unknown>)['BarcodeDetector'];
    expect(canScan()).toBe(false);
  });

  it('says no when there is a detector but no camera API', () => {
    (globalThis as Record<string, unknown>)['BarcodeDetector'] = function () {};
    (globalThis as Record<string, unknown>)['navigator'] = {};
    expect(canScan()).toBe(false);
    delete (globalThis as Record<string, unknown>)['BarcodeDetector'];
  });
});
