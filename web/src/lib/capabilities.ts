/**
 * What this app offers a person, declared once.
 *
 * Four hand-written tests used to guard four versions of one idea — that a claim on a screen
 * corresponds to something real, that a screen is cached, that a control exists, that a page
 * does not secretly depend on a watch. Each was written *after* the failure it guards.
 * Together they were this file, discovered one incident at a time.
 *
 * Three things derive from it, and none is written per capability:
 *
 *  1. **The screen is in the build**, and is cached for offline
 *  2. **Every claim appears on it**, in the built HTML
 *  3. **`requires` is the truth** — a browser test seeds exactly what is declared and
 *     nothing more, then operates the control. A capability that needs more than it admits
 *     to fails, which is how peer presence secretly requiring a Watchtower would have been
 *     caught on the day it was written
 *
 * ## Why the claims must be unconditional
 *
 * A claim is checked against the prerendered HTML, so it cannot sit behind `{#if}` on state
 * a fresh visitor lacks. That reads like a limitation and is the opposite: five times this
 * session an important sentence was hidden behind a conditional, and each time the fix was
 * to move it to where somebody reads it *before* deciding — how unpairing works, before the
 * pairing form; what a wipe does not reach, before the wipe button; what a check proves,
 * before the record is fetched.
 *
 * **Putting the claim where the test can see it puts it where the operator can.**
 */

/** What must be on a device before a capability works at all. */
export type Requirement =
  /** A callsign and keypair. The only genuinely required setup step. */
  | 'identity'
  /** A configured Watchtower. Most operators have none, and most capabilities need none. */
  | 'watch'
  /** At least one paired peer. */
  | 'peers';

export interface Capability {
  name: string;
  /** Route, relative to the site root, with its trailing slash. */
  screen: string;
  /**
   * Sentences that must appear on that screen.
   *
   * Pick the load-bearing ones: the claim, and the limit that keeps the claim honest. Two
   * or three. This is not a copy test — it is a check that the promise still has a
   * mechanism behind it.
   */
  claims: string[];
  /** A CSS selector for the thing a person operates. Checked in a real browser. */
  control?: string;
  requires: Requirement[];
}

export const CAPABILITIES: Capability[] = [
  {
    name: 'Set up a callsign',
    screen: 'terminal/setup/',
    claims: [
      'Never a legal name',
      // 5.7. An operator reading "no account, no legal name" could reasonably conclude
      // they are anonymous. They are not, and it is said where the key is generated.
      'This is a pseudonym, not anonymity',
      'everything you sign with it links together',
      // The watch section must read as optional, or an operator who knows nobody believes
      // their setup is unfinished.
      'the section below is optional'
    ],
    control: '#callsign',
    requires: []
  },
  {
    name: 'Add a watch',
    screen: 'terminal/setup/',
    claims: [
      'Nothing discovers a Watchtower on its own',
      // Who can read what you send is the one thing an operator must know before
      // configuring a squad-held watch, and it is stated before the field.
      'whoever is on this list can read everything',
      'Usually empty'
    ],
    control: '#holders',
    requires: []
  },
  {
    name: 'Somebody you would call',
    screen: 'terminal/setup/',
    claims: [
      'you have to press send',
      // The number never leaves the phone, so there is no roster of operators' contacts
      // for a seizure to find.
      'Their number stays on this phone'
    ],
    control: '#cnumber',
    requires: []
  },
  {
    name: 'Cached directory',
    screen: 'terminal/directory/',
    claims: [
      'Opening it is what saves it',
      'Only what you open is kept'
    ],
    requires: []
  },
  {
    name: 'Go out',
    screen: 'terminal/sign-on/',
    claims: [
      'A district, never an address',
      // A missed check-in nudges and does nothing else. Alarm fatigue destroys the one
      // mechanism where failure means somebody is hurt.
      'never counts as distress'
    ],
    control: '#area',
    requires: ['identity']
  },
  {
    name: 'Share where you are',
    screen: 'terminal/sign-on/',
    claims: [
      'no setting that makes it public',
      'Only the latest is kept',
      'cannot follow you with the app closed'
    ],
    control: '#share',
    requires: ['identity']
  },
  {
    name: 'Distress',
    screen: 'terminal/distress/',
    claims: [
      'It keeps sending until a human answers',
      'only you can stop it'
    ],
    control: 'button.raise',
    requires: ['identity']
  },
  {
    name: 'Your own patrols',
    screen: 'terminal/patrols/',
    claims: [
      'It stays on this phone',
      'nothing here is sent to a watch, a relay or anybody else'
    ],
    requires: ['identity']
  },
  {
    name: 'Peers',
    screen: 'terminal/peers/',
    claims: [
      'No watch is involved, no server holds it',
      'Best done face to face',
      'they are not told',
      // The commitment and its limit together. Watching for somebody is a nudge, and they
      // are told you are doing it -- a private note means somebody can believe they are
      // watched while nobody is.
      'they are told you are doing it',
      'nothing escalates, nobody is paged',
      // Somebody who owes a refusal accepts to avoid an awkward one. Said before any invite
      // has arrived, since that is when it changes what a person feels obliged to do.
      'ignoring sends nothing'
    ],
    control: '#code',
    requires: ['identity']
  },
  {
    name: 'Your card',
    screen: 'terminal/card/',
    claims: [
      // The claim that makes a card safe to publish at all, and the reason the contact key
      // exists. Stated before the form, not under it.
      'signed by a',
      'separate key',
      'A card carries no position',
      // Reducing exposure is never symmetrical with increasing it, and a control that
      // implies otherwise is a false promise this community would notice.
      'Publishing cannot be undone'
    ],
    control: '#region',
    requires: ['identity']
  },
  {
    name: 'Find somebody',
    screen: 'terminal/find/',
    claims: [
      'published a card about themselves',
      'gives them your key',
      // What a reader of this board must understand before deciding to be on it.
      'not on this board unless you put yourself there'
    ],
    control: '#area',
    requires: ['identity']
  },
  {
    name: 'Take the watch',
    screen: 'terminal/watch/',
    claims: [
      // 4.3, and the sentence the whole screen exists to make unmissable. Everything below
      // it looks like a safety monitor and is not one.
      'This app does not watch anybody. You do',
      'keeping it means looking',
      // Overdue nudges and does nothing else [invariant 3].
      'marked, and nothing else happens',
      // Invariant 2: only a human ends a Distress, and no button here closes one.
      'is not closed by answering it',
      // A new holder reading an empty board as "nobody is out" is the failure mode of
      // handover, and it is silent.
      'An empty board is not the same as nobody being out'
    ],
    requires: ['identity']
  },
  {
    name: 'Wipe this device',
    screen: 'terminal/wipe/',
    claims: [
      'Destroys tonight and keeps your identity',
      // Where a wipe stops is the part that changes what an operator does next.
      'The watch still has your board entry',
      'The accountability log is outside both tiers'
    ],
    requires: ['identity']
  },
  {
    name: 'What the watch wrote',
    screen: 'terminal/log/',
    claims: [
      'The watch writes down what it does',
      // A response carries entries, proofs AND the root they are against, all three from
      // the watch. Verifying them against each other proves nothing.
      'marking its own homework',
      // The limit that survives every green tick above it, and the reason it is stated
      // before the record is fetched rather than after.
      'whether anything is missing',
      'nothing signs yet'
    ],
    requires: ['identity']
  },
  {
    name: 'Query',
    screen: 'terminal/query/',
    claims: [
      // Nothing about the person being helped is ever recorded [invariant 1].
      'write about the need, not the person'
    ],
    control: '#q',
    requires: ['identity', 'watch']
  },
  {
    name: 'Assist',
    screen: 'terminal/assist/',
    claims: [
      'An assist with no words still means you need someone',
      'use Distress'
    ],
    control: '#a',
    requires: ['identity', 'watch']
  }
];

/** Every distinct screen a capability lives on. */
export const CAPABILITY_SCREENS = [...new Set(CAPABILITIES.map((c) => c.screen))];
