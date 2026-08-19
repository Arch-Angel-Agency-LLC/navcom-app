/**
 * The safety net for an operator with nobody watching.
 *
 * Weighted toward what the message says and what the link does, because those are the two
 * things a person under stress actually experiences — and the two that are silently wrong
 * if nobody checks them.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  callLink,
  clearContact,
  ContactError,
  distressMessage,
  loadContact,
  saveContact,
  smsLink
} from './contact';
import { burn, panicWipe } from './storage';

function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null
  };
}

beforeEach(installLocalStorage);

describe('keeping it', () => {
  it('survives a panic wipe, and does not survive a burn', () => {
    // An operator who wipes on a bad night must not find their safety net gone the next
    // time out. A burn is the deliberate, irreversible one and takes everything.
    saveContact('Sam', '+15550100');
    panicWipe();
    expect(loadContact()?.label).toBe('Sam');
    burn();
    expect(loadContact()).toBeNull();
  });

  it('accepts numbers in whatever shape the operator wrote them', () => {
    // Deliberately permissive. Numbers vary by country and dialler, and an operator locked
    // out of saving their own contact because a regex disagreed has been failed here in the
    // one place this app must not fail them.
    for (const n of ['+1 555 0100', '07700 900123', '(314) 555-0100', '555.0100']) {
      expect(saveContact('Sam', n).number, n).toBe(n);
    }
  });

  it('refuses an empty name, so nobody taps a number they cannot place', () => {
    expect(() => saveContact('  ', '+15550100')).toThrow(ContactError);
  });

  it('refuses something with no digits at all', () => {
    expect(() => saveContact('Sam', 'call the shop')).toThrow(ContactError);
  });

  it('is gone after removing it', () => {
    saveContact('Sam', '+15550100');
    clearContact();
    expect(loadContact()).toBeNull();
  });
});

describe('what their person reads', () => {
  const at = new Date('2026-08-19T23:41:00');

  it('says who, when, where, and that a person pressed it', () => {
    const msg = distressMessage({ callsign: 'Wren', area: 'Downtown', at });
    expect(msg).toContain('Wren');
    expect(msg).toContain('Downtown');
    expect(msg).toMatch(/need help/i);
    // The recipient was asleep. They need to know this was not a machine deciding something.
    expect(msg).toMatch(/not automatic/i);
  });

  it('still works with no callsign and no area', () => {
    const msg = distressMessage({ callsign: null, area: null, at });
    expect(msg).toMatch(/need help/i);
    expect(msg).not.toContain('null');
    expect(msg).not.toContain('undefined');
  });

  it('stays short enough to read on a lock screen', () => {
    const msg = distressMessage({ callsign: 'Wren', area: 'Riverfront and 4th', at });
    expect(msg.length).toBeLessThan(200);
  });
});

describe('the links', () => {
  const contact = { label: 'Sam', number: '+1 555 0100' };

  it('uses the one query form both iOS and Android accept', () => {
    // `?&body=` rather than `?body=` or `&body=`. Tested folklore rather than a standard,
    // and the reason this is asserted: a "tidy-up" to `?body=` breaks it on one platform
    // and nothing else in the app would notice.
    expect(smsLink(contact, 'hello')).toContain('?&body=');
  });

  it('escapes a message so it cannot break the link', () => {
    const link = smsLink(contact, 'I need help & I am at 4th/Market — now');
    expect(link).not.toMatch(/body=.*[&/].*&/);
    expect(decodeURIComponent(link.split('?&body=')[1]!)).toBe(
      'I need help & I am at 4th/Market — now'
    );
  });

  it('dials the number as the operator wrote it', () => {
    expect(callLink(contact)).toBe('tel:+1 555 0100');
  });
});
