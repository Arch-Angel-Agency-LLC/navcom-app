/**
 * Invariant 7, as assertions.
 *
 * "Panic wipe destroys the Wipeable tier and nothing else. Burn destroys everything on the
 * device. The node-side accountability log is outside both."
 *
 * Written because the invariant existed only as a comment above two functions that no
 * screen could reach — and a wipe that quietly took the wrong tier would be discovered by
 * an operator who had just lost their standing on the worst night of their year.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  burn, burnCaches, burnConfirmed, clearField, clearStorageError, get, panicWipe,
  set, storageError, tierSizes, tierSummary
} from './storage';

/** Enough of the real thing for these assertions; the browser API is tiny here. */
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
  return store;
}

let raw: Map<string, string>;

beforeEach(() => {
  raw = installLocalStorage();
  set('accruing', 'callsign', 'Wren');
  set('accruing', 'secret', 'deadbeef');
  set('wipeable', 'signon', { area: 'Downtown' });
  set('wipeable', 'draft', 'bed tonight');
});

describe('the two tiers', () => {
  it('keeps them under separate keys, so a wipe cannot take the wrong half', () => {
    // One key holding both tiers would make panic wipe a read-modify-write, and a partial
    // failure there destroys identity. Two keys makes the destructive path a single delete.
    expect([...raw.keys()].sort()).toEqual(['navcom.accruing', 'navcom.wipeable']);
  });

  it('reads corrupt storage as empty rather than refusing to start', () => {
    raw.set('navcom.wipeable', '{not json');
    expect(get('wipeable', 'signon')).toBeNull();
    // And identity is unaffected by the neighbouring corruption.
    expect(get('accruing', 'callsign')).toBe('Wren');
  });
});

describe('panic wipe destroys the Wipeable tier and nothing else', () => {
  it('takes tonight', () => {
    panicWipe();
    expect(get('wipeable', 'signon')).toBeNull();
    expect(get('wipeable', 'draft')).toBeNull();
    expect(tierSummary().wipeable).toEqual([]);
  });

  it('keeps the decade', () => {
    // The whole point of the split: lose the evening, keep identity and standing. An
    // operator who wipes on a bad night must not need re-provisioning by another person
    // before they can work again.
    panicWipe();
    expect(get('accruing', 'callsign')).toBe('Wren');
    expect(get('accruing', 'secret')).toBe('deadbeef');
    expect(raw.has('navcom.accruing')).toBe(true);
  });

  it('is safe to run twice, and on a terminal that has nothing', () => {
    panicWipe();
    panicWipe();
    expect(get('accruing', 'callsign')).toBe('Wren');
  });
});

describe('burn destroys everything on the device', () => {
  it('takes both tiers, identity included', () => {
    burn();
    expect(tierSummary()).toEqual({ accruing: [], wipeable: [] });
    expect(raw.size).toBe(0);
  });

  it('takes the offline caches too, so the claim is true', () => {
    // "Everything on this device" stopped at localStorage until this existed -- the service
    // worker cache kept the cached directory and every terminal page.
    const deleted: string[] = [];
    (globalThis as Record<string, unknown>).caches = {
      keys: async () => ['navcom-terminal-1', 'navcom-terminal-2'],
      delete: async (k: string) => {
        deleted.push(k);
        return true;
      }
    };
    return burnCaches().then(() => {
      expect(deleted.sort()).toEqual(['navcom-terminal-1', 'navcom-terminal-2']);
    });
  });

  it('does not throw where the Cache API is absent', () => {
    delete (globalThis as Record<string, unknown>).caches;
    return expect(burnCaches()).resolves.toBeUndefined();
  });
});

describe('burn is gated on typing the callsign', () => {
  it('refuses anything that is not an exact match', () => {
    // Surrounding whitespace is tolerated on purpose (see below), so it is not listed here.
    for (const wrong of ['', 'wren', 'Wre', 'Wren2', 'WREN', 'W ren']) {
      expect(burnConfirmed(wrong, 'Wren'), `"${wrong}" should not burn`).toBe(false);
    }
    // Nothing was destroyed by any of those attempts.
    expect(get('accruing', 'callsign')).toBe('Wren');
  });

  it('tolerates the surrounding whitespace a phone keyboard adds', () => {
    expect(burnConfirmed('  Wren  ', 'Wren')).toBe(true);
    expect(tierSummary()).toEqual({ accruing: [], wipeable: [] });
  });

  it('never burns when there is no identity, even on an empty confirmation', () => {
    // The dangerous case: '' === '' would otherwise read as a match and destroy a device
    // whose identity had simply not loaded yet.
    expect(burnConfirmed('', null)).toBe(false);
    expect(get('accruing', 'callsign')).toBe('Wren');
  });
});

describe('tierSummary tells the operator what a wipe would take', () => {
  it('names the fields rather than counting them', () => {
    // A count invites gaming and tells an operator nothing about what they are losing.
    const summary = tierSummary();
    expect(summary.wipeable.sort()).toEqual(['draft', 'signon']);
    expect(summary.accruing.sort()).toEqual(['callsign', 'secret']);
  });

  it('stops naming a field once it is gone', () => {
    clearField('wipeable', 'draft');
    expect(tierSummary().wipeable).toEqual(['signon']);
  });
});


/**
 * What happens when the phone runs out of room.
 *
 * Added by audit. The one storage failure that must not be silent: quota is typically
 * 5–10 MB, and this device accumulates a metro's corrections, peers, endorsements and a
 * patrol record. **An operator whose storage is full silently stops recording patrols** and
 * finds out by looking for one later.
 */
function installRefusingStorage(name = 'QuotaExceededError') {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: () => {
      const e = new Error('exceeded the quota');
      e.name = name;
      throw e;
    },
    removeItem: (k: string) => void store.delete(k)
  };
}

describe('a device that cannot save', () => {
  it('reports the failure rather than throwing into whoever was writing', () => {
    // Throwing surfaces as a rejected click somewhere with no message.
    installRefusingStorage();
    expect(() => set('accruing', 'callsign', 'Wren')).not.toThrow();
    expect(set('accruing', 'callsign', 'Wren')).toBe(false);
  });

  it('says it is out of room, in words an operator can act on', () => {
    installRefusingStorage();
    set('accruing', 'callsign', 'Wren');
    expect(storageError()).toMatch(/out of storage/i);
    expect(storageError()).toMatch(/clearing an area/i);
  });

  it('distinguishes a full phone from a refusing one', () => {
    // Private browsing throws here too. Both mean "this was not saved", but only one is
    // fixed by clearing an area, so only one says so.
    installRefusingStorage('SecurityError');
    set('accruing', 'callsign', 'Wren');
    expect(storageError()).not.toMatch(/out of storage/i);
    expect(storageError()).toMatch(/could not be saved/i);
  });

  it('clears the report once a write succeeds', () => {
    installRefusingStorage();
    set('accruing', 'callsign', 'Wren');
    expect(storageError()).not.toBeNull();

    installLocalStorage();
    expect(set('accruing', 'callsign', 'Wren')).toBe(true);
    expect(storageError()).toBeNull();
  });
});

describe('when it can save', () => {
  it('says so, and the value is there', () => {
    installLocalStorage();
    expect(set('accruing', 'callsign', 'Wren')).toBe(true);
    expect(get<string>('accruing', 'callsign')).toBe('Wren');
    expect(storageError()).toBeNull();
  });

  it('can say what is taking the room', () => {
    // A measurement of a device, not a count of anything anybody did.
    installLocalStorage();
    set('accruing', 'callsign', 'Wren');
    expect(tierSizes().accruing).toBeGreaterThan(0);
    expect(tierSizes().wipeable).toBe(0);
  });
});
