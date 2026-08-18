/**
 * Watch state — kind 10910.
 *
 * Published by the node, unencrypted, replaceable. A cold client must be able to read it
 * before signing on [C23, invariant 4], because an operator must never believe a human is
 * watching when none is.
 *
 * Normative source: docs/spec/watch-state.spec.md
 */

import type { Author } from '../attestation';
import { KIND_WATCH_STATE } from './kinds';

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
}

export const WATCH_STATE_VERSION = 2;

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
    last_drill: input.last_drill
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

/**
 * Reads a watch state event.
 *
 * **Absence is Dark, not an error and not "unknown".** A client that cannot find this event
 * renders Dark, because the honest reading of silence is that nothing is watching.
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
      last_drill: p.last_drill ?? null
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
  last_drill: null
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
