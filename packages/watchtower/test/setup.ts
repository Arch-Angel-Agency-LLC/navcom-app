/**
 * Node 18 does not expose WebCrypto as a global; Node 20 does, and this package requires
 * >=20. This only makes a local run on an older Node match what CI does.
 *
 * Test scaffolding — nothing in src/ polyfills anything.
 */
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
