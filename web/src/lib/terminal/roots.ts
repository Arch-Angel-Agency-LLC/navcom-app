/**
 * What this device has seen the watch commit to.
 *
 * Kind `10910` is replaceable, so a relay only ever serves the newest root. Left alone,
 * the watch would be the sole custodian of the evidence against itself — so the terminal
 * keeps its own copies, and a rewritten history becomes something the operator can show
 * rather than something only the watch could reveal.
 *
 * Stored in the **accruing** tier. These are hashes: they say nothing about where anyone
 * was or what anyone asked, and they are worth more the longer they go back. A panic wipe
 * takes tonight and must not take the record of what the watch claimed last month.
 */

import { observeRoot, type LogRoot, type RootAlarm } from '@navcom/core';
import { get, set } from './storage';

const FIELD = 'seen_roots';

export function seenRoots(): LogRoot[] {
  return get<LogRoot[]>('accruing', FIELD) ?? [];
}

/**
 * Folds a newly published root into the record, and reports anything that does not add up.
 *
 * Returns the alarm rather than acting on it: this module records, and the screen decides
 * what to say. An alarm is never cleared automatically — a contradiction seen once stays
 * seen, because the pair of roots is the evidence.
 */
export function recordRoot(incoming: LogRoot | null): RootAlarm | null {
  const { seen, alarm } = observeRoot(seenRoots(), incoming);
  set('accruing', FIELD, seen);
  if (alarm) {
    // Kept separately from the roots themselves so a later rotation of the bounded root
    // list can never quietly discard the finding.
    const alarms = get<RootAlarm[]>('accruing', 'root_alarms') ?? [];
    set('accruing', 'root_alarms', [...alarms, alarm]);
  }
  return alarm;
}

/** Every contradiction this device has ever seen. Never cleared by anything but a burn. */
export function rootAlarms(): RootAlarm[] {
  return get<RootAlarm[]>('accruing', 'root_alarms') ?? [];
}
