/**
 * The operator's own record.
 *
 * Two things carry weight here: that it stays on the device, and that the export cannot
 * expose somebody who never agreed to anything.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  exportPatrols,
  formatDuration,
  keepsHistory,
  patrols,
  recordPatrol,
  setKeepHistory,
  type Patrol
} from './patrol';
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

const T = Date.UTC(2026, 7, 14, 21, 40) / 1000;
const night = (over: Partial<Patrol> = {}): Patrol => ({
  started: T, ended: T + 3 * 3600 + 35 * 60, area: 'Downtown', ...over
});

beforeEach(installLocalStorage);

describe('where it lives', () => {
  it('is destroyed by a panic wipe unless the operator said otherwise', () => {
    // Off by default. The Protest Medic needs a phone that is useless to whoever takes it.
    expect(keepsHistory()).toBe(false);
    recordPatrol(night());
    panicWipe();
    expect(patrols()).toEqual([]);
  });

  it('survives a panic wipe when the operator chose that, and a burn takes it anyway', () => {
    setKeepHistory(true);
    recordPatrol(night());
    panicWipe();
    expect(patrols()).toHaveLength(1);
    burn();
    expect(patrols()).toEqual([]);
  });

  it('moves what already exists when the answer changes', () => {
    // Changing your mind must not be a way to lose a year of nights by accident.
    recordPatrol(night());
    recordPatrol(night({ area: 'Riverfront' }));
    setKeepHistory(true);
    expect(patrols()).toHaveLength(2);
    setKeepHistory(false);
    expect(patrols()).toHaveLength(2);
  });

  it('does not leave a copy behind in the tier it moved out of', () => {
    recordPatrol(night());
    setKeepHistory(true);
    // A forgotten copy in the wipeable tier would survive nothing and confuse everything.
    panicWipe();
    expect(patrols()).toHaveLength(1);
  });
});

describe('what leaves the phone', () => {
  const opts = { callsign: 'Wren' };

  it('names the operator and totals the nights', () => {
    const out = exportPatrols([night(), night({ started: T + 86400, ended: T + 86400 + 7200 })], opts);
    expect(out).toContain('Wren');
    expect(out).toContain('2 patrols');
    expect(out).toMatch(/5h 35m/);
  });

  it('carries no coordinates at any precision', () => {
    // The stream showed a street corner. The export should not carry a GPS fix the stream
    // never did -- and there is no field here that could hold one.
    const out = exportPatrols([night({ note: 'quiet' })], opts);
    expect(out).not.toMatch(/\d+\.\d{4,}/);
  });

  it('carries nobody but the operator', () => {
    // Your movements are yours to publish. Raven's are not, and Raven agreed to nothing.
    const out = exportPatrols([night({ closedBy: 'Raven' })], opts);
    expect(out).not.toContain('Raven');
  });

  it('can leave the areas out', () => {
    expect(exportPatrols([night()], opts)).toContain('Downtown');
    expect(exportPatrols([night()], { ...opts, includeAreas: false })).not.toContain('Downtown');
  });

  it('reads sensibly with no callsign and no patrols', () => {
    const out = exportPatrols([], { callsign: null });
    expect(out).toContain('0 patrols');
    expect(out).not.toContain('null');
    expect(out).not.toContain('undefined');
  });

  it('includes the operator\'s own words, and only those', () => {
    const out = exportPatrols([night({ note: 'two handouts at the underpass' })], opts);
    expect(out).toContain('two handouts at the underpass');
  });
});

describe('durations read like a person wrote them', () => {
  it('drops the hours when there are none', () => {
    expect(formatDuration(35 * 60)).toBe('35m');
    expect(formatDuration(3 * 3600 + 35 * 60)).toBe('3h 35m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('never renders a negative night', () => {
    expect(formatDuration(-500)).toBe('0m');
  });
});
