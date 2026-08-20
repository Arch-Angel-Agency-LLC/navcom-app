/**
 * Saying no to an `Assist`.
 *
 * An `assist` means *"I need someone."* A watch that cannot send anybody has to be able to
 * say so — an operator who asked for help, got an acknowledgement, and waited is in the same
 * position as one told help was coming. They can act on "nobody is coming". They cannot act
 * on silence.
 *
 * The tests that matter are about where this may **not** be said.
 */

import { describe, expect, it } from 'vitest';
import { declineIsValid } from '../src/index.js';

describe('where nobody-is-coming may be said', () => {
  it('answers an assist, which is what it exists for', () => {
    expect(declineIsValid('assist')).toBe(true);
  });

  it('answers a query, since a watch may simply not know', () => {
    // "I could not find out" is a real answer and a better one than an invented address.
    // A confident wrong answer at 10pm is the worst failure available to this system.
    expect(declineIsValid('query')).toBe(true);
  });

  it('is never valid in reply to a Distress', () => {
    // Invariant 2: Distress terminates in a human, or tells the operator it could not. That
    // reporting is the escalation ladder's job, in its own escalation-status. A watch able
    // to decline one could end it with a tap.
    expect(declineIsValid('distress')).toBe(false);
  });

  it('refuses anything it does not recognise', () => {
    // An unrecognised signal is not a licence to decline it. A future signal type must be
    // added here deliberately, rather than inheriting the ability to be refused.
    for (const type of ['on-station', 'routine', 'stood-down', 'log-review', 'distress-ack', '']) {
      expect(declineIsValid(type), type).toBe(false);
    }
  });
});
