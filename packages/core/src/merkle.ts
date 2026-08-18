/**
 * Inclusion proofs for the accountability log.
 *
 * The problem this solves is the one the chain could not: an operator may review the
 * entries that concern them [C33], and must not be shown anyone else's — but a chain link
 * points at the entry before it in the *full* log, so a filtered view has nothing to check
 * against. See `log.ts` for how that was found.
 *
 * A Merkle tree separates the two. Each entry is a leaf; the node publishes a signed root;
 * an operator verifies their own entries against a root they saw published, holding
 * `log₂(n)` sibling hashes and **nothing about anybody else**. A hash reveals no content,
 * so the proof is safe to hand over.
 *
 * Structured as RFC 6962 (Certificate Transparency), not hand-rolled. Two properties are
 * worth naming, because the obvious implementation lacks both:
 *
 *  - **Domain separation.** Leaves hash with a `0x00` prefix and internal nodes with `0x01`,
 *    so an internal node can never be passed off as a leaf. Without it, a proof can be
 *    forged for data that was never in the tree.
 *  - **No duplicated odd node.** Splitting at the largest power of two below `n`, rather
 *    than duplicating a lone trailing leaf, avoids the ambiguity where two different logs
 *    produce the same root.
 *
 * A leaf is the entry's **stated** chain hash, so the root does not commit to readable
 * content on its own — editing an entry's text without editing its hash leaves the root
 * untouched. `verifyInclusion` recomputes the entry's own hash before checking the path,
 * which is what closes that. The two are only sound together, and neither should be used
 * alone.
 *
 * What this does NOT close, and the screen must say so: **omission.** A watch that simply
 * never writes an entry publishes a root for a tree that never contained it, and every
 * proof still verifies. Only the subject counter-signing closes that.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { entryHashInput, type CompleteLog, type LogEntry } from './log.js';

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function hashLeaf(leaf: Uint8Array): Uint8Array {
  return sha256(concat(Uint8Array.of(LEAF_PREFIX), leaf));
}

function hashNode(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(Uint8Array.of(NODE_PREFIX), left, right));
}

/** Largest power of two strictly less than n, for n > 1. */
function split(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

function treeHash(leaves: Uint8Array[]): Uint8Array {
  if (leaves.length === 0) return sha256(new Uint8Array());
  if (leaves.length === 1) return hashLeaf(leaves[0]!);
  const k = split(leaves.length);
  return hashNode(treeHash(leaves.slice(0, k)), treeHash(leaves.slice(k)));
}

function auditPath(index: number, leaves: Uint8Array[]): Uint8Array[] {
  if (leaves.length <= 1) return [];
  const k = split(leaves.length);
  return index < k
    ? [...auditPath(index, leaves.slice(0, k)), treeHash(leaves.slice(k))]
    : [...auditPath(index - k, leaves.slice(k)), treeHash(leaves.slice(0, k))];
}

/**
 * The leaf value for an entry.
 *
 * The entry's own chain hash, which already commits to its content *and* its position, so
 * a leaf cannot be moved to a different point in history without changing.
 */
function leafOf(entry: LogEntry): Uint8Array {
  return hexToBytes(entry.hash);
}

export interface LogRoot {
  /** Hex sha256. */
  root: string;
  /** How many entries the tree covers. Part of what a proof is checked against. */
  size: number;
  /** Unix seconds the root was computed. */
  at: number;
}

export interface InclusionProof {
  /** Which leaf, counting from the log's declared start. */
  index: number;
  /** Tree size the proof is against. A proof is only meaningful with its size. */
  size: number;
  /** Sibling hashes, leaf upwards. Hex. */
  path: string[];
}

/** The root over the whole log. An empty log still has one, and it is well defined. */
export function merkleRoot(log: CompleteLog, at: number): LogRoot {
  return { root: bytesToHex(treeHash(log.map(leafOf))), size: log.length, at };
}

export function inclusionProof(log: CompleteLog, index: number): InclusionProof {
  if (index < 0 || index >= log.length) {
    throw new RangeError(`No entry at index ${index} (log has ${log.length})`);
  }
  return {
    index,
    size: log.length,
    path: auditPath(index, log.map(leafOf)).map(bytesToHex)
  };
}

/**
 * Recomputes an entry's own hash from its content.
 *
 * Run before trusting `entry.hash` anywhere: without this the watch could hand over an
 * entry whose stated hash is in the tree while its readable content says something else.
 */
export function entryHashIsHonest(entry: LogEntry): boolean {
  return entryHashInput(entry) === entry.hash;
}

/**
 * Verifies one entry is in the tree the root commits to.
 *
 * Checks the entry against its own hash first, so a proof can never vouch for content that
 * was swapped underneath it.
 */
export function verifyInclusion(entry: LogEntry, proof: InclusionProof, root: LogRoot): boolean {
  if (!entryHashIsHonest(entry)) return false;
  if (proof.size !== root.size) return false;
  if (proof.index < 0 || proof.index >= proof.size) return false;

  // RFC 6962 §2.1.1 audit path verification.
  let fn = proof.index;
  let sn = proof.size - 1;
  let r = hashLeaf(leafOf(entry));

  for (const sibling of proof.path) {
    if (sn === 0) return false;
    const p = hexToBytes(sibling);
    if ((fn & 1) === 1 || fn === sn) {
      r = hashNode(p, r);
      while ((fn & 1) === 0 && fn !== 0) {
        fn >>>= 1;
        sn >>>= 1;
      }
    } else {
      r = hashNode(r, p);
    }
    fn >>>= 1;
    sn >>>= 1;
  }
  return sn === 0 && bytesToHex(r) === root.root;
}

/**
 * What a client noticed when comparing a newly published root against what it has seen.
 *
 * `10910` is replaceable, so a relay only ever serves the latest root. The node is
 * therefore the sole custodian of the evidence against itself unless clients keep their own
 * copies — which is the whole point of storing these on the device.
 */
export type RootAlarm =
  /** Fewer entries than a root already seen. Retention does this legitimately; so does deletion. */
  | { kind: 'shrank'; was: LogRoot; now: LogRoot }
  /** The same tree size, a different root. History was rewritten. Nothing legitimate does this. */
  | { kind: 'diverged'; was: LogRoot; now: LogRoot }
  /** A watch that was committing to a log has stopped. */
  | { kind: 'stopped'; was: LogRoot };

/** How many observations a client keeps. Bounded so a terminal cannot fill its storage. */
export const ROOTS_KEPT = 64;

/**
 * Folds a newly seen root into what a client already holds.
 *
 * Identical consecutive observations are not stored — the heartbeat republishes the same
 * root every interval, and keeping each one would evict the older, more useful history
 * within an hour.
 *
 * **`diverged` is the finding this whole mechanism exists to produce.** A watch that
 * rewrote an entry after publishing a root over it cannot make both roots true, and an
 * operator holding the older one can say so. Every other alarm has an innocent explanation;
 * this one does not.
 */
export function observeRoot(
  seen: readonly LogRoot[],
  incoming: LogRoot | null
): { seen: LogRoot[]; alarm: RootAlarm | null } {
  const last = seen.at(-1);

  if (incoming === null) {
    return { seen: [...seen], alarm: last ? { kind: 'stopped', was: last } : null };
  }
  if (!last) return { seen: [incoming], alarm: null };

  // Same observation restated. Nothing to record, nothing to report.
  if (last.root === incoming.root && last.size === incoming.size) {
    return { seen: [...seen], alarm: null };
  }

  const priorAtSameSize = seen.find((r) => r.size === incoming.size);
  const alarm: RootAlarm | null =
    priorAtSameSize && priorAtSameSize.root !== incoming.root
      ? { kind: 'diverged', was: priorAtSameSize, now: incoming }
      : incoming.size < last.size
        ? { kind: 'shrank', was: last, now: incoming }
        : null;

  // Kept even when it alarms: the contradictory pair IS the evidence.
  const next = [...seen, incoming];
  return { seen: next.slice(-ROOTS_KEPT), alarm };
}
