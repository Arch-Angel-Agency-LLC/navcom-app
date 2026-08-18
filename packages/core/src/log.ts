/**
 * The accountability log.
 *
 * It exists so the watch can be checked — the watch is the highest-privilege position in
 * the system, and [C33] makes its actions reviewable by the operators they concern.
 *
 * **And the watch writes it.** That is a real hole rather than a quibble: a hostile watch
 * that can rewrite its own record defeats the mechanism named as its own mitigation.
 *
 * Two separate problems, closed separately:
 *
 *   tampering    — editing history after the fact. Closed here, by chaining.
 *   fabrication  — writing a false entry at the time. NOT closed here. It needs the
 *                  subject to counter-sign, which is a later sprint and gated on the
 *                  Watchtower opening past people who were personally vetted.
 *
 * Chaining is about twenty lines and makes retroactive edits detectable. It does not make
 * a lie impossible, and this module does not pretend otherwise.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import type { Author } from './attestation.js';

export type LogAction =
  | 'took-watch'
  | 'handed-over'
  | 'acked'
  | 'answered'
  | 'marked-overdue'
  | 'contacted'
  | 'escalated'
  | 'drill-run'
  | 'drill-result';

export interface LogEntry {
  /** Unix seconds. */
  at: number;
  /** Who acted. */
  actor: Author;
  action: LogAction;
  /**
   * The operator this concerns, if any.
   *
   * An `Author`, not a callsign — callsigns are not unique. There is no registry, so two
   * operators can both be Raven, and keying the record that holds the watch accountable on
   * a non-unique name would attribute one person's entries to another. Matching is by
   * pubkey; the callsign rides along for reading.
   */
  subject: Author | null;
  outcome: string;
  /**
   * Hex sha256 over this entry plus the previous hash. An edit anywhere breaks every
   * link after it.
   */
  hash: string;
  /** The entry before this one. Null only for the first. */
  prev: string | null;
  /**
   * Signature by the **subject**, confirming this is what happened to them.
   *
   * Absent everywhere today. When present it turns an entry from the watch's account of
   * itself into something the affected operator agreed with.
   */
  countersig?: string;
}

/** Never positions, areas or query text [C27]. The log records actions, not movements. */
export type NewEntry = Omit<LogEntry, 'hash' | 'prev' | 'countersig'>;

const GENESIS = null;

function digest(entry: NewEntry, prev: string | null): string {
  // Field order is fixed so the same entry always hashes the same way.
  const canonical = JSON.stringify([
    entry.at,
    entry.actor.kind,
    entry.actor.callsign ?? null,
    entry.actor.pubkey ?? null,
    entry.action,
    entry.subject?.kind ?? null,
    entry.subject?.callsign ?? null,
    entry.subject?.pubkey ?? null,
    entry.outcome,
    prev
  ]);
  return bytesToHex(sha256(utf8ToBytes(canonical)));
}

export function appendEntry(log: LogEntry[], entry: NewEntry): LogEntry[] {
  const prev = log.length === 0 ? GENESIS : log[log.length - 1].hash;
  return [...log, { ...entry, prev, hash: digest(entry, prev) }];
}

export interface ChainCheck {
  intact: boolean;
  /** Index of the first entry that does not verify, or -1. */
  brokenAt: number;
  reason: string | null;
}

/**
 * Verifies the chain.
 *
 * An operator reviewing entries about themselves can run this and know whether the record
 * has been edited since it was written — without trusting the party that wrote it.
 */
export function verifyChain(log: LogEntry[]): ChainCheck {
  let prev: string | null = GENESIS;
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    if (e.prev !== prev) {
      return { intact: false, brokenAt: i, reason: 'entry does not follow the one before it' };
    }
    if (digest(e, prev) !== e.hash) {
      return { intact: false, brokenAt: i, reason: 'entry content does not match its hash' };
    }
    prev = e.hash;
  }
  return { intact: true, brokenAt: -1, reason: null };
}

/**
 * What an operator sees when reviewing a watch: actions, never a movement history.
 *
 * Matched on pubkey. Passing a callsign would return whatever another Raven did.
 */
export function entriesAbout(log: LogEntry[], pubkey: string): LogEntry[] {
  return log.filter((e) => e.subject?.pubkey === pubkey);
}
