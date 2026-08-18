/**
 * Watch state — kind 10910.
 *
 * Published by the node, unencrypted, replaceable. A cold client must be able to read it
 * before signing on [C23, invariant 4], because an operator must never believe a human is
 * watching when none is.
 *
 * Normative source: docs/spec/watch-state.spec.md
 */

import { KIND_WATCH_STATE } from './kinds';

export type WatchState = 'station' | 'automated-oncall' | 'automated' | 'dark';
export type HolderKind = 'human' | 'agent';
export type AgentHealth = 'ok' | 'degraded' | 'down';

export interface DrillResult {
  /** Unix seconds. */
  at: number;
  result: 'pass' | 'fail';
}

export interface WatchStatePayload {
  state: WatchState;
  holder: string | null;
  holder_kind: HolderKind | null;
  oncall_count: number;
  since: number;
  agent_health: AgentHealth;
  /** Null when no drill has ever run — which is itself a fact worth publishing. */
  last_drill: DrillResult | null;
}

/** What the node knows before it decides what to publish. */
export interface WatchStateInput {
  state: WatchState;
  holder: string | null;
  holder_kind: HolderKind | null;
  /** On-call operators the ladder could page **right now**. */
  pageableOnCall: number;
  since: number;
  agent_health: AgentHealth;
  last_drill: DrillResult | null;
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
  let state = input.state;

  if (state === 'automated-oncall') {
    const unproven = input.last_drill === null || input.last_drill.result === 'fail';
    if (input.pageableOnCall === 0 || unproven) state = 'automated';
  }

  return {
    state,
    holder: input.holder,
    holder_kind: input.holder_kind,
    oncall_count: input.pageableOnCall,
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
      state: p.state,
      holder: p.holder ?? null,
      holder_kind: p.holder_kind ?? null,
      oncall_count: p.oncall_count ?? 0,
      since: p.since ?? 0,
      agent_health: p.agent_health ?? 'down',
      last_drill: p.last_drill ?? null
    };
  } catch {
    return darkState();
  }
}

export const darkState = (): WatchStatePayload => ({
  state: 'dark',
  holder: null,
  holder_kind: null,
  oncall_count: 0,
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
  if (s.oncall_count === 0) {
    return 'An agent holds the board. Distress will page nobody and tell you so.';
  }
  const n = s.oncall_count;
  const drill =
    s.last_drill?.result === 'pass'
      ? ' Last drill passed.'
      : ' No passing drill on record.';
  return `An agent holds the board. ${n} on-call, reachable now.${drill}`;
}
