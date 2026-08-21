/**
 * The escalation ladder.
 *
 * Safety-critical. The guarantee is one sentence: **`Distress` terminates in a human, or the
 * operator is told it could not** [invariant 2]. The ladder is allowed to fail. It is never
 * allowed to fail silently.
 *
 * This module is the state machine only — pure, no I/O, no clock of its own. That is not
 * tidiness: the seven failure modes in `spec/escalation.spec.md` are the point of the spec,
 * and a ladder that can only be tested by standing up relays and waiting five minutes is a
 * ladder whose failure paths never get tested.
 *
 * Two things this module structurally cannot do, both deliberate:
 *
 *  - **It cannot start itself.** Only a received `20911` produces a ladder. There is no
 *    timer, no missed window, no inactivity check and no assessment in here [invariant 3].
 *  - **It cannot ask an agent anything.** Nothing here takes a callback, a model, or a
 *    policy object. A degraded, hung or hostile agent cannot impair escalation because
 *    there is no seam through which it could [C25].
 *
 * Normative source: docs/spec/escalation.spec.md
 */

import type { Author } from './attestation.js';
import { pageableNow, type OnCall } from './events/watch-state.js';

export type LadderState = 'paging' | 'contact' | 'exhausted' | 'acknowledged';

export interface LadderWindows {
  /** How long to wait for an on-call human before trying the emergency contact. */
  pagingSeconds: number;
  /** How long to wait for the emergency contact before giving up and saying so. */
  contactSeconds: number;
}

export const DEFAULT_WINDOWS: LadderWindows = { pagingSeconds: 300, contactSeconds: 300 };

export interface Ladder {
  /** The `20911` that started it. Also the idempotency key — one distress, one ladder. */
  readonly distressId: string;
  readonly operator: string;
  readonly startedAt: number;
  state: LadderState;
  /** When the current state was entered. Windows are measured from here. */
  stateSince: number;
  /**
   * Who was paged, **by name**.
   *
   * A name, not a total: an operator being told "2 on-call" learns less than one told
   * "Wren and Raven", and a number is the thing that invites gaming. Where a declaration
   * carries no callsign the pubkey's first characters stand in, which is still a handle
   * rather than a tally.
   */
  readonly paged: string[];
  readonly hasEmergencyContact: boolean;
  acknowledgedBy: Author | null;
}

export interface LadderStart {
  distressId: string;
  operator: string;
  /** The full roster. Filtering to who is actually reachable happens here, once. */
  oncall: OnCall[];
  hasEmergencyContact: boolean;
  now: number;
}

function nameOf(entry: OnCall): string {
  return entry.author.callsign ?? entry.author.pubkey?.slice(0, 8) ?? 'unnamed';
}

/**
 * Starts a ladder, and decides its opening state.
 *
 * An empty pageable roster does **not** produce a paging state that pages nobody for five
 * minutes. Failure mode 1: it goes straight to `CONTACT`, and with no emergency contact
 * either, straight to `EXHAUSTED` — reached faster, and still reported. Waiting out a
 * window with nobody on the other end is five minutes an operator does not have.
 */
export function startLadder(input: LadderStart): Ladder {
  // The same rule that decides who is PUBLISHED as on-call decides who is PAGED. If these
  // ever diverged, `10910` would advertise reachability the ladder does not actually use.
  const reachable = pageableNow(input.oncall, input.now);
  const paged = reachable.map(nameOf);

  const state: LadderState =
    paged.length > 0 ? 'paging' : input.hasEmergencyContact ? 'contact' : 'exhausted';

  return {
    distressId: input.distressId,
    operator: input.operator,
    startedAt: input.now,
    state,
    stateSince: input.now,
    paged,
    hasEmergencyContact: input.hasEmergencyContact,
    acknowledgedBy: null
  };
}

/**
 * Advances the ladder if its current window has closed.
 *
 * Pure and idempotent: calling it repeatedly inside a window changes nothing, and calling
 * it on a terminal state changes nothing. The caller owns the clock.
 */
export function advanceLadder(ladder: Ladder, now: number, windows: LadderWindows = DEFAULT_WINDOWS): Ladder {
  if (ladder.state === 'acknowledged' || ladder.state === 'exhausted') return ladder;

  const elapsed = now - ladder.stateSince;

  if (ladder.state === 'paging') {
    if (elapsed < windows.pagingSeconds) return ladder;
    return {
      ...ladder,
      state: ladder.hasEmergencyContact ? 'contact' : 'exhausted',
      stateSince: now
    };
  }

  if (elapsed < windows.contactSeconds) return ladder;
  return { ...ladder, state: 'exhausted', stateSince: now };
}

/**
 * A human has it. The ladder stops.
 *
 * **Only an explicit human acceptance reaches here.** A delivery receipt, a read receipt or
 * an app-open event MUST NOT be routed into this function — someone whose phone buzzed is
 * not someone who woke up. An agent may never acknowledge: invariant 5 says an agent is
 * never the sole responder to `Distress`, and an agent ack that stopped the ladder would
 * make it the only one.
 *
 * Acknowledging an already-exhausted ladder is accepted. Somebody arriving late is still
 * somebody arriving.
 */
export function acknowledge(ladder: Ladder, by: Author, now: number): Ladder {
  if (by.kind !== 'human') return ladder;
  if (ladder.state === 'acknowledged') return ladder;
  return { ...ladder, state: 'acknowledged', stateSince: now, acknowledgedBy: by };
}

/**
 * What the operator is told, on every transition [C42].
 *
 * Plain sentences, because they are read by someone in trouble. `EXHAUSTED` says nobody is
 * coming without hedging it — an operator who knows that can act on it, and an operator who
 * is left guessing cannot.
 */
export function ladderReport(ladder: Ladder): string {
  switch (ladder.state) {
    case 'paging':
      return `Paging ${ladder.paged.join(', ')}.`;
    case 'contact':
      return ladder.paged.length > 0
        ? 'No answer from on-call — trying your emergency contact.'
        : 'Nobody is on-call — trying your emergency contact.';
    case 'acknowledged':
      return `${ladder.acknowledgedBy?.callsign ?? 'Someone'} is responding.`;
    case 'exhausted':
      return ladder.hasEmergencyContact
        ? "Couldn't reach anyone. Nobody is coming."
        : "Couldn't reach anyone, and you have no emergency contact set. Nobody is coming.";
  }
}

/**
 * Tracks live ladders so one distress produces one ladder.
 *
 * Failure mode 7. A phone retrying an unacknowledged `Distress` — which the client is
 * *required* to do, indefinitely — republishes the same event, and relays may deliver it
 * more than once besides. Two ladders would page everyone twice and race each other to
 * report contradictory states to the same operator.
 */
export class LadderRegistry {
  private readonly ladders = new Map<string, Ladder>();

  /** Returns the existing ladder for this distress, or starts one. Never two. */
  open(input: LadderStart): { ladder: Ladder; started: boolean } {
    const existing = this.ladders.get(input.distressId);
    if (existing) return { ladder: existing, started: false };
    const ladder = startLadder(input);
    this.ladders.set(input.distressId, ladder);
    return { ladder, started: true };
  }

  get(distressId: string): Ladder | undefined {
    return this.ladders.get(distressId);
  }

  /** Advances every live ladder, returning only those that actually changed state. */
  tickAll(now: number, windows: LadderWindows = DEFAULT_WINDOWS): Ladder[] {
    const changed: Ladder[] = [];
    for (const [id, ladder] of this.ladders) {
      const next = advanceLadder(ladder, now, windows);
      if (next.state === ladder.state) continue;
      this.ladders.set(id, next);
      changed.push(next);
    }
    return changed;
  }

  acknowledge(distressId: string, by: Author, now: number): Ladder | null {
    const ladder = this.ladders.get(distressId);
    if (!ladder) return null;
    const next = acknowledge(ladder, by, now);
    if (next === ladder) return null;
    this.ladders.set(distressId, next);
    return next;
  }

  /**
   * Drops ladders that finished long enough ago to be nobody's business.
   *
   * The map grew forever. On a box meant to run for months that is a slow leak, and under a
   * flood of `20911` from fresh keys it is a fast one — every ladder ever opened stayed
   * resident and was walked once a second.
   *
   * **Only terminal ladders, and only after a retention window.** A live ladder is never
   * reaped at any age: a `paging` ladder that vanished would stop escalating with nobody
   * told, which is invariant 2 failing in the exact silent way it forbids. Acknowledged and
   * exhausted ladders are kept a while longer so a late duplicate of the same `20911` finds
   * the finished ladder rather than starting a second one.
   */
  reap(now: number, retentionSeconds: number): number {
    let dropped = 0;
    for (const [id, ladder] of this.ladders) {
      const terminal = ladder.state === 'acknowledged' || ladder.state === 'exhausted';
      if (!terminal) continue;
      if (now - ladder.stateSince < retentionSeconds) continue;
      this.ladders.delete(id);
      dropped++;
    }
    return dropped;
  }

  /** Live ladders. Deliberately not persisted — a ladder outlives nothing. */
  all(): Ladder[] {
    return [...this.ladders.values()];
  }
}
