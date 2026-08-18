import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadOrCreateKeypair } from "../src/shared/identity.js";

describe("loadOrCreateKeypair", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("generates and persists a key when the path doesn't exist", () => {
    dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
    const path = join(dir, "sub", "key.txt");

    const kp = loadOrCreateKeypair(path);
    expect(kp.secretKey).toHaveLength(32);
    expect(kp.pubkey).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(path)).toBe(true);
  });

  it("loads the same keypair on a second call (does not regenerate)", () => {
    dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
    const path = join(dir, "key.txt");

    const first = loadOrCreateKeypair(path);
    const second = loadOrCreateKeypair(path);
    expect(second.pubkey).toBe(first.pubkey);
    expect(Buffer.from(second.secretKey)).toEqual(Buffer.from(first.secretKey));
  });

  it("persists the key file with owner-only permissions", () => {
    dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
    const path = join(dir, "key.txt");
    loadOrCreateKeypair(path);

    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  describe("malformed key file (found in review)", () => {
    // Buffer.from(hex, "hex") silently truncates/drops invalid input
    // instead of throwing -- a corrupted or truncated key file used to
    // produce a wrong-length secretKey with no clear error.
    it("rejects a truncated (odd-length) hex file", () => {
      dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
      const path = join(dir, "key.txt");
      writeFileSync(path, "a".repeat(63) + "\n"); // 63 chars, not 64

      expect(() => loadOrCreateKeypair(path)).toThrow(/does not contain a valid secret key/);
    });

    it("rejects a file containing non-hex characters", () => {
      dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
      const path = join(dir, "key.txt");
      writeFileSync(path, "z".repeat(64) + "\n");

      expect(() => loadOrCreateKeypair(path)).toThrow(/does not contain a valid secret key/);
    });

    it("rejects uppercase hex (must be lowercase, matching bytesToHex's own output)", () => {
      dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
      const path = join(dir, "key.txt");
      writeFileSync(path, "A".repeat(64) + "\n");

      expect(() => loadOrCreateKeypair(path)).toThrow(/does not contain a valid secret key/);
    });

    it("rejects an empty file", () => {
      dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
      const path = join(dir, "key.txt");
      writeFileSync(path, "");

      expect(() => loadOrCreateKeypair(path)).toThrow(/does not contain a valid secret key/);
    });
  });

  describe("concurrent creation race (found in review)", () => {
    it("loses the exclusive-create race gracefully and loads the actual winner instead of throwing or diverging from disk", async () => {
      // Simulates two processes racing loadOrCreateKeypair() on the same
      // path -- exactly what happened live during this project's own
      // testing, when a stray daemon process wasn't actually killed
      // before a second one started against the same watchtower.key.
      // existsSync is mocked to still say "false" (as it would have for
      // BOTH racing processes at the moment they each checked) even
      // though the file genuinely already exists, forcing this call
      // down the create path and into a REAL EEXIST from the exclusive
      // "wx" write -- not just calling the function twice sequentially,
      // which would never exercise the race window at all (the second
      // call would take the normal existsSync===true path).
      //
      // node:fs's own exports aren't configurable (vi.spyOn can't
      // redefine them), so this uses vi.doMock + a fresh dynamic import
      // instead, scoped to just this one test via resetModules.
      dir = mkdtempSync(join(tmpdir(), "watchtower-test-"));
      const path = join(dir, "key.txt");
      const winner = loadOrCreateKeypair(path); // the "other process" that really won

      vi.resetModules();
      vi.doMock("node:fs", async () => {
        const real = await vi.importActual<typeof import("node:fs")>("node:fs");
        return {
          ...real,
          existsSync: (p: string) => (p === path ? false : real.existsSync(p)),
        };
      });

      try {
        const { loadOrCreateKeypair: loadRaced } = await import("../src/shared/identity.js");
        const loser = loadRaced(path);
        expect(loser.pubkey).toBe(winner.pubkey);
        expect(Buffer.from(loser.secretKey)).toEqual(Buffer.from(winner.secretKey));
      } finally {
        vi.doUnmock("node:fs");
        vi.resetModules();
      }
    });
  });
});
