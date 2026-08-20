/**
 * Watch state — kind 10910.
 *
 * Published by the node, unencrypted, replaceable. A cold client must be able to read it
 * before signing on [C23, invariant 4], because an operator must never believe a human is
 * watching when none is.
 *
 * Normative source: docs/spec/watch-state.spec.md
 */

import type { Author } from '../attestation.js';
import type { LogRoot } from '../merkle.js';
import { KIND_WATCH_STATE } from './kinds.js';

export type WatchState = 'station' | 'automated-oncall' | 'automated' | 'dark';
export type HolderKind = 'human' | 'agent';
export type AgentHealth = 'ok' | 'degraded' | 'down';

export interface DrillResult {
  /** Unix seconds. */
  at: number;
  result: 'pass' | 'fail';
  /** Who ran it. Today the node; the shape does not assume that. */
  author: Author;
  /**
   * Who actually woke up, each signing for themselves.
   *
   * Empty today, because nothing counter-signs yet — and an empty array is the honest
   * reading of that. A drill the node reports about itself is a claim; a drill carrying
   * acknowledgements from other keys is evidence.
   */
  acknowledged: Author[];
}

/**
 * One on-call operator's own statement that they are reachable.
 *
 * **The node must not assert this on anyone's behalf.** Today it synthesises these entries
 * with itself as author, which is a self-report and is marked as such. When operators sign
 * their own, only the author changes — the shape, the wire format and every consumer stay
 * put. That is the whole reason this is an array of authored statements rather than a
 * number the node picks.
 */
export interface OnCall {
  author: Author;
  /** How they can be woken. `console-open` is never sufficient alone. */
  channel: 'sms' | 'voice' | 'push' | 'console-open';
  /** Unix seconds. A stale declaration is not a reachable person. */
  expires: number;
  /** Hex signature by `author`. Absent means the node is speaking for them. */
  sig?: string;
}

export interface WatchStatePayload {
  /** Bumped when the shape changes in a way a consumer must notice. */
  v: number;
  state: WatchState;
  holder: string | null;
  holder_kind: HolderKind | null;
  /**
   * Who is on-call, each as their own statement rather than a number the node chose.
   *
   * A count can be inflated by whoever publishes it. A list of authored, signed statements
   * can only be inflated by forging keys — so a consumer counts the evidence instead of
   * trusting the total.
   */
  oncall: OnCall[];
  since: number;
  agent_health: AgentHealth;
  /** Null when no drill has ever run — itself a fact worth publishing. */
  last_drill: DrillResult | null;
  /**
   * How many operators are currently overdue. **A count, never a list.**
   *
   * The spec requires the node to notify whoever holds watch when someone crosses into
   * overdue, and `10910` already is the mechanism by which anyone watching sees the board
   * needs attention. Added by the daemon implementation for exactly that reason.
   *
   * The cost, stated rather than implied: `10910` is unencrypted, so this announces *that*
   * an operator is overdue to anyone subscribed. It never says who — no callsign, no
   * pubkey, no area — but a watcher correlating timing learns something. That is the
   * [Doxxer's](../../../docs/research/ecosystem-roster.md) method.
   *
   * Kept because the alternative today is not notifying at all: the Console, which reads
   * the board directly and needs no public field, does not exist yet. **Drop this once it
   * does.**
   */
  overdue_count: number;
  /**
   * A commitment to the accountability log as it stands right now.
   *
   * Published here rather than as a new kind: `10910` is already node-published, already
   * signed by the Watchtower key, and already read by a cold client, so the root arrives
   * signed with no new protocol surface. Null when the node keeps no log — which is itself
   * the fact worth publishing.
   *
   * What it buys: the root **pins history at a point in time**. A watch cannot retroactively
   * change an entry that a published root already covered without every operator holding an
   * old root being able to notice.
   *
   * What it does not buy: honesty about entries never written. A root over a tree that
   * omits an entry verifies perfectly. That is `countersig`, and it is gated.
   *
   * `10910` is replaceable, so a relay serves only the latest. A client that wants the
   * pinning property must **keep the roots it has seen** — the node cannot be the sole
   * custodian of the evidence against it.
   *
   * It is a **checkpoint**, republished on the heartbeat rather than on every entry, so an
   * entry written seconds ago is genuinely not covered yet. `size` is what makes that
   * legible: an operator verifies entries up to the size their root covers, and knows the
   * rest are pending rather than unverifiable.
   */
  log_root: LogRoot | null;
}

// Bumped for log_root. Additive, so a v2 reader ignoring the field still works, but a v3
// reader can tell a node that publishes no root from one too old to know about them.
export const WATCH_STATE_VERSION = 3;

/** Reachable now: not expired, and not console-open standing alone [C40]. */
export function pageableNow(oncall: OnCall[], nowSeconds: number): OnCall[] {
  const live = oncall.filter((o) => o.expires > nowSeconds);
  const realChannels = live.filter((o) => o.channel !== 'console-open');
  // If the only declarations are console-open, treat the roster as empty and say so.
  return realChannels.length > 0 ? live : [];
}

/** What the node knows before it decides what to publish. */
export interface WatchStateInput {
  state: WatchState;
  holder: string | null;
  holder_kind: HolderKind | null;
  /** Every on-call declaration the node holds, expired or not. */
  oncall: OnCall[];
  since: number;
  agent_health: AgentHealth;
  last_drill: DrillResult | null;
  overdue_count: number;
  /** Absent when the node keeps no accountability log, which is published as null. */
  log_root?: LogRoot | null;
  /** Unix seconds, supplied rather than read from a clock this module does not own. */
  now: number;
}

/**
 * Decides what may honestly be published, and it is deliberately not a straight copy.
 *
 * Two demotions, both because publishing a capability that does not exist is the same class
 * of failure as publishing an agent as a human:
 *
 * 1. **No pageable on-call means `automated`, never `automated-oncall`.** An operator whose
 *    only channel is a console they have closed is not reachable [C40].
 * 2. **A failed or absent drill demotes `automated-oncall` to `automated`.** The on-call
 *    claim is exactly what a drill tests, so an untested ladder cannot be advertised [C29].
 *    `station` is unaffected — a human is genuinely present regardless.
 */
export function publishableWatchState(input: WatchStateInput): WatchStatePayload {
  const reachable = pageableNow(input.oncall, input.now);
  let state = input.state;

  if (state === 'automated-oncall') {
    const unproven = input.last_drill === null || input.last_drill.result === 'fail';
    if (reachable.length === 0 || unproven) state = 'automated';
  }

  return {
    v: WATCH_STATE_VERSION,
    state,
    holder: input.holder,
    holder_kind: input.holder_kind,
    // Only the reachable are published. An expired declaration is not a person who will wake.
    oncall: reachable,
    since: input.since,
    agent_health: input.agent_health,
    last_drill: input.last_drill,
    overdue_count: input.overdue_count,
    log_root: input.log_root ?? null
  };
}

export function buildWatchStateEvent(input: WatchStateInput, createdAt: number) {
  return {
    kind: KIND_WATCH_STATE,
    created_at: createdAt,
    tags: [] as string[][],
    content: JSON.stringify(publishableWatchState(input))
  };
}

export type DarkReason =
  | 'absent'
  | 'stale'
  | 'corrupt'
  /** This device's clock and the node's disagree, so the age means nothing. */
  | 'clock';

export interface WatchStateRead {
  state: WatchStatePayload;
  /** True when the client must render Dark, whatever the payload said. */
  dark: boolean;
  reason: DarkReason | null;
  /** Age of the event in seconds, where one was found. */
  ageSeconds: number | null;
}

/**
 * How long a watch state may go unrefreshed before it is treated as Dark.
 *
 * Meant to be a small multiple of the daemon's publish interval. *Configurable.*
 */
export const STALE_AFTER_SECONDS = 300;

/**
 * How far the node's clock may lead this device's before the age becomes unusable.
 *
 * A watch state carries a `created_at` the node wrote. If that sits meaningfully in this
 * device's future, the two clocks disagree — and every staleness judgement made from the
 * difference is then arithmetic on a number that means nothing.
 *
 * Generous, because normal skew is seconds: relay delivery, a phone that has not synced
 * since it woke, an NTP nudge. Two minutes catches the failures that matter — a phone
 * hours or days out, which is ordinary on a cheap handset that has been off — while
 * ignoring the noise.
 */
export const CLOCK_TOLERANCE_SECONDS = 120;

/**
 * Reads a watch state event, and decides whether the client must render Dark.
 *
 * **Absence is Dark — and so is staleness, which is the part that is easy to miss.**
 *
 * `10910` is a *replaceable* kind, so a relay keeps serving the daemon's last published
 * copy long after the daemon has died. A client checking only for absence would fetch that
 * corpse, read `automated`, and tell an operator a watch exists when nothing is running.
 * That is invariant 4 failing in the exact way it was written to prevent.
 *
 * Found by running the loop against a real relay rather than by reading the spec, which is
 * why this function takes an age it cannot infer for itself.
 *
 * **A disagreeing clock is Dark too**, and that one is asymmetric in a way worth naming.
 * A device clock running *fast* makes a live watch look old, so it reads Dark — wrong, and
 * wrong in the safe direction. A device clock running *slow* makes a dead watch look fresh,
 * and tells an operator somebody is watching when nobody is. That is the direction invariant
 * 4 exists to prevent, and it is detectable: an event stamped in this device's future can
 * only mean the clocks disagree.
 *
 * The other direction is not reliably detectable and does not need to be. `10910` is
 * replaceable, so a genuinely old event legitimately arrives now — "stale" and "our clock is
 * fast" look identical from one event, and both already render Dark.
 */
export function readWatchStateAt(
  content: string | null | undefined,
  opts: {
    createdAt?: number | null;
    now?: number;
    staleAfterSeconds?: number;
    clockToleranceSeconds?: number;
  } = {}
): WatchStateRead {
  const parsed = readWatchState(content);

  if (!content) return { state: darkState(), dark: true, reason: 'absent', ageSeconds: null };
  if (parsed.state === 'dark' && content) {
    // Parsed to dark from malformed content.
    try {
      JSON.parse(content);
    } catch {
      return { state: darkState(), dark: true, reason: 'corrupt', ageSeconds: null };
    }
  }

  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const staleAfter = opts.staleAfterSeconds ?? STALE_AFTER_SECONDS;

  if (opts.createdAt == null) {
    // No age available means no way to tell a live watch from a preserved corpse. The
    // honest answer is Dark rather than an optimistic reading.
    return { state: darkState(), dark: true, reason: 'stale', ageSeconds: null };
  }

  const ageSeconds = now - opts.createdAt;

  // Stamped in our future by more than delivery could explain. We cannot tell whose clock
  // is wrong, and it does not matter: an age computed from disagreeing clocks is a number
  // with no meaning, so no claim about a live watch can rest on it.
  if (ageSeconds < -(opts.clockToleranceSeconds ?? CLOCK_TOLERANCE_SECONDS)) {
    return { state: darkState(), dark: true, reason: 'clock', ageSeconds };
  }

  if (ageSeconds > staleAfter) {
    return { state: darkState(), dark: true, reason: 'stale', ageSeconds };
  }

  return { state: parsed, dark: parsed.state === 'dark', reason: null, ageSeconds };
}

/**
 * Parses the payload only. **Prefer `readWatchStateAt`** — this cannot tell a live watch
 * from a stale one, and a replaceable event outlives the daemon that published it.
 */
export function readWatchState(content: string | null | undefined): WatchStatePayload {
  if (!content) return darkState();
  try {
    const p = JSON.parse(content) as Partial<WatchStatePayload>;
    if (!p.state) return darkState();
    return {
      v: p.v ?? 1,
      state: p.state,
      holder: p.holder ?? null,
      holder_kind: p.holder_kind ?? null,
      oncall: Array.isArray(p.oncall) ? p.oncall : [],
      since: p.since ?? 0,
      agent_health: p.agent_health ?? 'down',
      last_drill: p.last_drill ?? null,
      overdue_count: p.overdue_count ?? 0,
      // A v2 node publishes no root. Null reads as "this watch commits to no log", which is
      // the honest reading of its absence rather than a shape to paper over.
      log_root: p.log_root ?? null
    };
  } catch {
    return darkState();
  }
}

export const darkState = (): WatchStatePayload => ({
  v: WATCH_STATE_VERSION,
  state: 'dark',
  holder: null,
  holder_kind: null,
  oncall: [],
  since: 0,
  agent_health: 'down',
  last_drill: null,
  overdue_count: 0,
  // Dark commits to nothing. There is no watch to hold accountable right now.
  log_root: null
});

/**
 * What an operator is actually told before going out — the consequence, not the label.
 * A word like "Automated" is not enough on its own.
 */
export function capabilitySentence(s: WatchStatePayload): string {
  if (s.state === 'dark') {
    return 'No watch. Distress will page nobody — the terminal will tell you so, and it still works offline.';
  }
  if (s.state === 'station') {
    const who = s.holder ? `${s.holder} is` : 'A human is';
    return `${who} at the console right now.`;
  }
  if (s.oncall.length === 0) {
    return 'An agent holds the board. Distress will page nobody and tell you so.';
  }
  const n = s.oncall.length;
  const drill =
    s.last_drill?.result === 'pass'
      ? ' Last drill passed.'
      : ' No passing drill on record.';
  return `An agent holds the board. ${n} on-call, reachable now.${drill}`;
}
