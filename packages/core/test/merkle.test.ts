/**
 * Inclusion proofs.
 *
 * Weighted towards the forgeries rather than the happy path: this exists so an operator can
 * disbelieve the watch, and code whose only tests are "a valid proof verifies" tells you
 * nothing about whether an invalid one is rejected.
 */

import { describe, expect, it } from 'vitest';
import {
  appendEntry,
  emptyLog,
  entriesAbout,
  inclusionProof,
  merkleRoot,
  observeRoot,
  ROOTS_KEPT,
  verifyInclusion,
  type CompleteLog,
  type LogRoot,
  type LogEntry,
  type LogOutcome
} from '../src/index.js';

const node = { kind: 'agent' as const, callsign: 'watchtower', pubkey: 'c'.repeat(64) };
const wren = { kind: 'human' as const, callsign: 'Wren', pubkey: 'a'.repeat(64) };
const raven = { kind: 'human' as const, callsign: 'Raven', pubkey: 'b'.repeat(64) };

function build(n: number, subjects: { pubkey: string }[] = []): CompleteLog {
  let log = emptyLog();
  for (let i = 0; i < n; i++) {
    const subject = subjects.length > 0 ? subjects[i % subjects.length]! : wren;
    log = appendEntry(log, {
      at: 1000 + i,
      actor: node,
      action: 'acked',
      subject: { kind: 'human', pubkey: subject.pubkey },
      outcome: 'acknowledged' as LogOutcome
    });
  }
  return log;
}

describe('a root over the whole log', () => {
  it('is defined for an empty log and changes as soon as anything is written', () => {
    const empty = merkleRoot(emptyLog(), 0);
    expect(empty.size).toBe(0);
    expect(merkleRoot(build(1), 0).root).not.toBe(empty.root);
  });

  it('changes when any honestly-written entry changes', () => {
    // Two logs that differ only in one entry's outcome, each built properly so the chain
    // hashes -- and therefore the leaves -- differ.
    const a = emptyLog();
    const base = { at: 1000, actor: node, action: 'acked' as const, subject: wren };
    const one = appendEntry(a, { ...base, outcome: 'acknowledged' });
    const other = appendEntry(a, { ...base, outcome: 'contact-made' });
    expect(merkleRoot(one, 0).root).not.toBe(merkleRoot(other, 0).root);
  });

  it('commits to content only through the chain hash, which the verifier rechecks', () => {
    // Worth stating rather than assuming: a leaf is the entry's STATED hash, so editing an
    // entry's readable content without editing its hash leaves the root untouched. The root
    // alone therefore does not commit to content -- verifyInclusion recomputing the entry's
    // own hash is what closes that, and the pair is only sound together.
    const log = build(3);
    const edited = [...log] as LogEntry[];
    edited[1] = { ...edited[1]!, outcome: 'contact-made' };
    expect(merkleRoot(edited as unknown as CompleteLog, 0).root).toBe(merkleRoot(log, 0).root);
    expect(verifyInclusion(edited[1]!, inclusionProof(log, 1), merkleRoot(log, 0))).toBe(false);
  });

  it('is stable for the same log', () => {
    expect(merkleRoot(build(7), 0).root).toBe(merkleRoot(build(7), 99).root);
  });

  it('distinguishes logs of different length that share a prefix', () => {
    // The classic Merkle ambiguity: duplicating a lone trailing leaf makes some N-leaf and
    // (N+1)-leaf trees collide. RFC 6962's split avoids it, and this is the assertion that
    // would catch a "simplification" back to duplication.
    const roots = new Set<string>();
    for (let n = 1; n <= 12; n++) roots.add(merkleRoot(build(n), 0).root);
    expect(roots.size).toBe(12);
  });
});

describe('an operator verifying their own entries', () => {
  it('verifies without ever seeing anyone else\'s', () => {
    // Three operators interleaved. Wren gets her entries and their proofs, nothing more.
    const log = build(9, [wren, raven, { pubkey: 'd'.repeat(64) }]);
    const root = merkleRoot(log, 0);

    const handedOver = log
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.subject?.pubkey === wren.pubkey)
      .map(({ entry, index }) => ({ entry, proof: inclusionProof(log, index) }));

    expect(handedOver).toHaveLength(3);
    for (const { entry, proof } of handedOver) {
      expect(verifyInclusion(entry, proof, root)).toBe(true);
    }
    // What Wren received contains no other operator's pubkey -- only sibling hashes.
    expect(JSON.stringify(handedOver)).not.toContain(raven.pubkey);
  });

  it('verifies at every position in trees of every size up to 33', () => {
    for (let n = 1; n <= 33; n++) {
      const log = build(n);
      const root = merkleRoot(log, 0);
      for (let i = 0; i < n; i++) {
        expect(verifyInclusion(log[i]!, inclusionProof(log, i), root), `n=${n} i=${i}`).toBe(true);
      }
    }
  });

  it('composes with entriesAbout, which the chain could not', () => {
    const log = build(6, [wren, raven]);
    const mine = entriesAbout(log, wren.pubkey);
    const root = merkleRoot(log, 0);
    for (const entry of mine) {
      const index = log.findIndex((e) => e.hash === entry.hash);
      expect(verifyInclusion(entry, inclusionProof(log, index), root)).toBe(true);
    }
  });
});

describe('forgeries', () => {
  it('rejects an entry whose readable content was swapped under a valid proof', () => {
    // The attack the entry-hash check exists for: keep the hash that IS in the tree, change
    // what the entry says. Without recomputing, the proof would happily vouch for it.
    const log = build(5);
    const root = merkleRoot(log, 0);
    const proof = inclusionProof(log, 2);
    const swapped: LogEntry = { ...log[2]!, outcome: 'contact-made' };
    expect(verifyInclusion(swapped, proof, root)).toBe(false);
  });

  it('rejects a proof for a different entry in the same tree', () => {
    const log = build(5);
    const root = merkleRoot(log, 0);
    expect(verifyInclusion(log[3]!, inclusionProof(log, 1), root)).toBe(false);
  });

  it('rejects a proof from a different tree', () => {
    const mine = build(5);
    const theirs = build(5, [raven]);
    expect(verifyInclusion(mine[2]!, inclusionProof(theirs, 2), merkleRoot(mine, 0))).toBe(false);
  });

  it('rejects a proof checked against a root of a different size', () => {
    // A stale root is the likely honest version of this, and it must not silently pass.
    const log = build(5);
    expect(verifyInclusion(log[2]!, inclusionProof(log, 2), merkleRoot(build(6), 0))).toBe(false);
  });

  it('rejects a truncated or padded audit path', () => {
    const log = build(8);
    const root = merkleRoot(log, 0);
    const proof = inclusionProof(log, 5);
    expect(verifyInclusion(log[5]!, { ...proof, path: proof.path.slice(1) }, root)).toBe(false);
    expect(verifyInclusion(log[5]!, { ...proof, path: [...proof.path, '00'.repeat(32)] }, root)).toBe(false);
  });

  it('rejects an out-of-range index', () => {
    const log = build(4);
    const root = merkleRoot(log, 0);
    const proof = inclusionProof(log, 1);
    expect(verifyInclusion(log[1]!, { ...proof, index: 9 }, root)).toBe(false);
    expect(verifyInclusion(log[1]!, { ...proof, index: -1 }, root)).toBe(false);
  });

  it('cannot pass an internal node off as a leaf', () => {
    // Domain separation. Without the 0x00/0x01 prefixes an attacker can present an internal
    // node's hash as a leaf and prove membership of data that was never in the log.
    const log = build(4);
    const root = merkleRoot(log, 0);
    const proof = inclusionProof(log, 0);
    // The first sibling is leaf 1; a tree without prefixes would let it stand as a subtree.
    const forged: LogEntry = { ...log[0]!, hash: proof.path[0]! };
    expect(verifyInclusion(forged, proof, root)).toBe(false);
  });
});

describe('what a client remembers about published roots', () => {
  const at = (size: number, root: string, when = 0): LogRoot => ({ root, size, at: when });

  it('records the first root it ever sees, quietly', () => {
    const { seen, alarm } = observeRoot([], at(3, 'aaa'));
    expect(seen).toHaveLength(1);
    expect(alarm).toBeNull();
  });

  it('does not store the same root restated on every heartbeat', () => {
    // Republished every interval. Storing each would evict the older, more useful history
    // within an hour and defeat the entire mechanism.
    let seen: LogRoot[] = [];
    for (let i = 0; i < 100; i++) seen = observeRoot(seen, at(3, 'aaa', i)).seen;
    expect(seen).toHaveLength(1);
  });

  it('raises DIVERGED when the same tree size carries a different root', () => {
    // The finding this exists to produce. Nothing legitimate rewrites history; a watch that
    // did cannot make both published roots true, and the operator holds the older one.
    let seen = observeRoot([], at(3, 'aaa')).seen;
    seen = observeRoot(seen, at(5, 'bbb')).seen;
    const { alarm, seen: after } = observeRoot(seen, at(3, 'ccc'));
    expect(alarm?.kind).toBe('diverged');
    // The contradictory pair is kept -- it is the evidence.
    expect(after).toHaveLength(3);
  });

  it('raises SHRANK when the log gets smaller', () => {
    const seen = observeRoot([], at(10, 'aaa')).seen;
    expect(observeRoot(seen, at(4, 'bbb')).alarm?.kind).toBe('shrank');
  });

  it('raises STOPPED when a watch that committed to a log stops', () => {
    const seen = observeRoot([], at(10, 'aaa')).seen;
    expect(observeRoot(seen, null).alarm?.kind).toBe('stopped');
  });

  it('says nothing when a watch never committed to a log at all', () => {
    expect(observeRoot([], null).alarm).toBeNull();
  });

  it('does not alarm on ordinary growth', () => {
    let seen: LogRoot[] = [];
    for (let n = 1; n <= 20; n++) {
      const { seen: next, alarm } = observeRoot(seen, at(n, `root-${n}`));
      expect(alarm, `growth to ${n}`).toBeNull();
      seen = next;
    }
  });

  it('stays bounded so a terminal cannot fill its storage', () => {
    let seen: LogRoot[] = [];
    for (let n = 1; n <= 500; n++) seen = observeRoot(seen, at(n, `root-${n}`)).seen;
    expect(seen).toHaveLength(ROOTS_KEPT);
    // The most recent are what a fresh comparison needs.
    expect(seen.at(-1)!.size).toBe(500);
  });
});
