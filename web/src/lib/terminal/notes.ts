/**
 * A line you scribble about a place, on the phone, for yourself.
 *
 * You learn that a shelter shut intake at 20:30 while standing outside it in the rain, one
 * hand on the phone, gloves on. You cannot pick a field and choose an enum value in that
 * moment, and a correction you meant to make later is a correction that never happens.
 *
 * So: capture cold, correct warm. Jot the line now; turn it into a correction when you are
 * somewhere with light and both hands.
 *
 * ## It goes nowhere
 *
 * Never transmitted, never published, never seen by a peer or a watch. It is a note to
 * yourself about a place, and the moment it stops being that is the moment it should have
 * become a correction instead.
 *
 * ## Wipeable, deliberately
 *
 * The riskiest free text in the whole system is written here — in the field, in a hurry,
 * about something that just happened, which is exactly the situation where a line about a
 * *person* gets written despite every rule saying not to [invariant 1].
 *
 * So a note lives in the tier a panic wipe destroys. Losing an un-promoted note to a wipe is
 * the correct trade: a wipe exists for the night when losing tonight is the point, and a
 * scribble that survived it would be the one thing that did.
 */

import { get, set } from './storage';

const FIELD = 'record_notes';

type Notes = Record<string, string>;

export function notes(): Notes {
  return get<Notes>('wipeable', FIELD) ?? {};
}

/** What you wrote about one place, or null. */
export function noteFor(recordId: string): string | null {
  return notes()[recordId] ?? null;
}

/**
 * Keeps a note, or clears it when the text is empty.
 *
 * One note per record rather than a list: this is a reminder, not a log. A second thought
 * about the same place replaces the first, because by the time there are two you should be
 * writing a correction.
 */
export function keepNote(recordId: string, text: string): void {
  const all = { ...notes() };
  const clean = text.trim();
  if (clean) all[recordId] = clean;
  else delete all[recordId];
  set('wipeable', FIELD, all);
}

export function clearNote(recordId: string): void {
  keepNote(recordId, '');
}
