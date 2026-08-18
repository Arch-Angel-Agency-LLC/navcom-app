/**
 * The board.
 *
 * Held in memory. **Live tier — never written to durable storage** [C27]. There is no
 * queryable history of who was out where, because there is nothing to query.
 *
 * Normative source: docs/spec/watch-state.spec.md
 */

import type { Position } from './events/signal';

/** `stood-down` is absent on purpose: standing down removes the entry, it is not a state. */
export type EntryStatus = 'active' | 'overdue' | 'distress';

export interface BoardEntry {
  operator: string;
  callsign: string;
  /** Coarse. */
  area: string;
  signed_on: number;
  expected_until: number;
  routine_due: number | null;
  last_contact: number;
  position: Position | null;
  status: EntryStatus;
}

/** Configurable; defaults per spec. All seconds. */
export interface Lifetimes {
  routineInterval: number;
  overdueGrace: number;
  hardExpiry: number;
}

export const DEFAULT_LIFETIMES: Lifetimes = {
  routineInterval: 3600,
  overdueGrace: 1800,
  hardExpiry: 14400
};

/**
 * Whether an entry has crossed into overdue.
 *
 * Overdue **nudges**: mark it, tell whoever holds watch, try to make contact. It never
 * escalates, pages, or triggers any part of the ladder [C4, invariant 3] — people are late
 * for ordinary reasons far more often than dangerous ones, and false alarms train everyone
 * to ignore the real one.
 */
export function isOverdue(entry: BoardEntry, now: number, l: Lifetimes = DEFAULT_LIFETIMES): boolean {
  if (entry.status === 'distress') return false;
  if (now > entry.expected_until + l.overdueGrace) return true;
  if (entry.routine_due !== null && now > entry.routine_due + l.overdueGrace) return true;
  return false;
}

/**
 * Whether an entry should be dropped.
 *
 * Hard expiry stops a forgotten sign-on lingering forever. It is not a stand-down — the log
 * records expiry, not a completed op.
 *
 * **A distress entry is never dropped.** It holds until a human closes it, and no timer may
 * remove it, which is the difference between a board that expires and a board that loses
 * someone.
 */
export function isExpired(entry: BoardEntry, now: number, l: Lifetimes = DEFAULT_LIFETIMES): boolean {
  if (entry.status === 'distress') return false;
  return now > entry.expected_until + l.hardExpiry;
}

/** One pass over the board. Pure: no storage, no side effects, no clock of its own. */
export function tick(
  entries: BoardEntry[],
  now: number,
  l: Lifetimes = DEFAULT_LIFETIMES
): { board: BoardEntry[]; newlyOverdue: BoardEntry[]; expired: BoardEntry[] } {
  const board: BoardEntry[] = [];
  const newlyOverdue: BoardEntry[] = [];
  const expired: BoardEntry[] = [];

  for (const entry of entries) {
    if (isExpired(entry, now, l)) {
      expired.push(entry);
      continue;
    }
    if (entry.status === 'active' && isOverdue(entry, now, l)) {
      const marked = { ...entry, status: 'overdue' as const };
      newlyOverdue.push(marked);
      board.push(marked);
      continue;
    }
    board.push(entry);
  }

  return { board, newlyOverdue, expired };
}

/** Standing down removes the entry. The board holds who is out; someone home is not out. */
export function standDown(entries: BoardEntry[], operator: string): BoardEntry[] {
  return entries.filter((e) => e.operator !== operator);
}
