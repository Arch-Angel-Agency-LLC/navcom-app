import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";

// Buffer, not @noble/hashes -- this module is Node-only, so there's no
// reason to take a direct dependency on a package nostr-tools only pulls
// in transitively (pnpm's strict linking wouldn't resolve it as a direct
// import here anyway).
function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

const HEX64 = /^[0-9a-f]{64}$/;

// Found in review: Buffer.from(hex, "hex") does NOT validate its input --
// an odd-length string silently drops the trailing character, and
// invalid hex characters are silently dropped too (Buffer.from("zzzz",
// "hex") is a ZERO-length buffer, not a thrown error). A truncated or
// corrupted key file would silently produce a wrong-length secretKey.
// getPublicKey() does eventually throw on a wrong-length input (verified
// live: "Field.fromBytes: expected 32 bytes, got 4"), but with a cryptic
// low-level error instead of a clear one -- and a corruption that
// happens to still land on exactly 32 bytes wouldn't throw at all,
// silently producing a VALID-LOOKING but WRONG keypair. Validating the
// exact hex shape here catches the likely corruption modes with a clear,
// actionable message instead of relying on that downstream throw.
function hexToBytes(hex: string, path: string): Uint8Array {
  if (!HEX64.test(hex)) {
    throw new Error(
      `Key file ${path} does not contain a valid secret key (expected 64 lowercase hex characters, got ${hex.length} characters). ` +
        `The file may be corrupted or truncated -- if you're sure it's not needed, remove it and a new key will be generated.`,
    );
  }
  return new Uint8Array(Buffer.from(hex, "hex"));
}

export interface Keypair {
  secretKey: Uint8Array;
  pubkey: string;
}

/**
 * Load a secp256k1 secret key from `path` (hex-encoded, one line), or
 * generate one and persist it there if it doesn't exist yet. Never
 * transmitted, never escrowed -- this is the entire identity story for
 * both the Watchtower node and an operator's client, per the brief:
 * "Generated on the box, stored there, never leaves."
 */
export function loadOrCreateKeypair(path: string): Keypair {
  if (existsSync(path)) {
    const hex = readFileSync(path, "utf8").trim();
    const secretKey = hexToBytes(hex, path);
    return { secretKey, pubkey: getPublicKey(secretKey) };
  }

  const secretKey = generateSecretKey();
  const dir = dirname(path);
  if (dir && dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // Found in review: the existsSync() check above and this write are NOT
  // atomic -- two processes racing to start against the same key path
  // (exactly what happened during this project's own live testing, when
  // a stray daemon process wasn't actually killed before a second one
  // was started) could both see "doesn't exist" and both write DIFFERENT
  // random keys, with the loser's in-memory secretKey silently no longer
  // matching what's on disk. flag: "wx" makes the write itself exclusive
  // (fails with EEXIST if the file appeared in between) instead of
  // trusting the earlier existsSync() check; on that race, re-read
  // whatever the winner actually wrote rather than proceeding with a key
  // that doesn't match disk.
  try {
    writeFileSync(path, bytesToHex(secretKey) + "\n", { mode: 0o600, flag: "wx" });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === "EEXIST") {
      const hex = readFileSync(path, "utf8").trim();
      const winnerSecretKey = hexToBytes(hex, path);
      return { secretKey: winnerSecretKey, pubkey: getPublicKey(winnerSecretKey) };
    }
    throw err;
  }

  try {
    chmodSync(path, 0o600);
  } catch {
    // best-effort on platforms/filesystems that don't support chmod
  }
  return { secretKey, pubkey: getPublicKey(secretKey) };
}
