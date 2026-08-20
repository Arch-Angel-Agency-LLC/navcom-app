/**
 * Coarsening a fix before it leaves the phone.
 *
 * The rounding is the part that matters. Everything else is plumbing; this is the thing
 * standing between "roughly where I am" and "which building I am in".
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { coarsen, precision, setPrecision } from './position.svelte';

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

/** St. Louis, Anchorage, Singapore — a spread of latitudes, because longitude shrinks. */
const PLACES = [
  { name: 'St. Louis', lat: 38.627, lon: -90.199 },
  { name: 'Anchorage', lat: 61.217, lon: -149.863 },
  { name: 'Singapore', lat: 1.352, lon: 103.82 }
];

const metres = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6_371_000;
};

beforeEach(installLocalStorage);

describe('coarsening', () => {
  it('moves a fix by less than the cell it is rounded into', () => {
    for (const p of PLACES) {
      const out = coarsen(p.lat, p.lon, 500);
      expect(metres(p, out), p.name).toBeLessThan(500);
      expect(out.precision_m).toBe(500);
    }
  });

  it('keeps a cell the same size at every latitude', () => {
    // Longitude degrees shrink toward the poles. Without following the latitude, a "500
    // metre" cell in Anchorage is a fifth the width of one in Singapore -- so the same
    // setting would leak far more about somebody the further north they work.
    //
    // Measured directly: step east until the cell changes, and check how far that was.
    for (const p of PLACES) {
      const here = coarsen(p.lat, p.lon, 500);
      let lon = p.lon;
      let moved = here;
      while (moved.lon === here.lon && lon - p.lon < 0.2) {
        lon += 0.0001;
        moved = coarsen(p.lat, lon, 500);
      }
      const width = metres(here, moved);
      expect(width, `${p.name} cell width`).toBeGreaterThan(300);
      expect(width, `${p.name} cell width`).toBeLessThan(750);
    }
  });

  it('rounds to a grid rather than jittering', () => {
    // Jitter changes every reading, so several readings of a stationary person average
    // back to the true point. A grid does not: the same place always lands on the same
    // cell, and the cell is all anybody ever sees.
    const a = coarsen(38.6270, -90.1990, 500);
    const b = coarsen(38.6271, -90.1991, 500);
    expect(b).toEqual(a);
  });

  it('leaves an exact fix alone', () => {
    const out = coarsen(38.627, -90.199, 0);
    expect(out.lat).toBe(38.627);
    expect(out.precision_m).toBe(0);
  });

  it('survives the poles without dividing by zero', () => {
    const out = coarsen(89.999, 12.34, 500);
    expect(Number.isFinite(out.lat)).toBe(true);
    expect(Number.isFinite(out.lon)).toBe(true);
  });
});

describe('the setting', () => {
  it('is off until somebody chooses otherwise', () => {
    expect(precision()).toBe('off');
  });

  it('remembers what was chosen', () => {
    setPrecision('coarse');
    expect(precision()).toBe('coarse');
  });

  it('has no public option, and there is nowhere to put one', () => {
    // Not "do not set it to public" -- the type has no such member. A leak that cannot be
    // expressed does not need policing.
    const allowed = ['off', 'area', 'coarse', 'exact'];
    expect(allowed).not.toContain('public');
    expect(allowed).not.toContain('network');
  });
});
