/**
 * Node 18 does not expose WebCrypto as a global; Node 20 does, and CI runs 20. This makes
 * local runs match CI rather than requiring a flag.
 *
 * Test scaffolding only — nothing in src/ polyfills anything, because the browser and a
 * modern Node both provide this natively.
 */
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
