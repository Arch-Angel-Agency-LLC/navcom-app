/**
 * Checking what a watch handed back about you.
 *
 * The trap this module exists to avoid: a response carries entries, proofs, **and** the
 * root the proofs are against. Verifying the proofs against that root always succeeds,
 * because the watch produced all three. It is the watch marking its own homework, and a
 * screen showing a green tick for it would be worse than showing nothing — it would tell an
 * operator they had checked something when they had not.
 *
 * The check that means something: **the root must be one this device saw published**. That
 * is why the terminal keeps its own root history, and why `checkReview` will not accept a
 * root it does not recognise no matter how well the proofs verify.
 */

import type { LogEntry } from './log.js';
import { verifyInclusion, type LogRoot } from './merkle.js';
import type { LogReview } from './events/response.js';

export type ReviewProblem =
  /** The root is not one this device ever saw the watch publish. */
  | { kind: 'root-not-seen'; root: LogRoot }
  /** An entry did not verify against the root — content swapped, or a proof that is not for it. */
  | { kind: 'entry-unproven'; entry: LogEntry }
  /** An entry names somebody else as its subject. Nothing legitimate sends this. */
  | { kind: 'not-about-me'; entry: LogEntry };

export interface ReviewCheck {
  /** Every entry, with whether it stood up. Shown either way — a failure is the finding. */
  entries: { entry: LogEntry; proven: boolean }[];
  problems: ReviewProblem[];
  /** True only when the root was one we saw AND every entry proved out. */
  sound: boolean;
}

export function checkReview(
  review: LogReview,
  seen: readonly LogRoot[],
  myPubkey: string
): ReviewCheck {
  const problems: ReviewProblem[] = [];

  // Matched on root AND size together: a root value alone could be replayed against a
  // different tree size, and size is half of what a proof is checked against.
  const recognised = seen.some((r) => r.root === review.root.root && r.size === review.root.size);
  if (!recognised) problems.push({ kind: 'root-not-seen', root: review.root });

  const entries = review.entries.map(({ entry, proof }) => {
    // An entry about someone else is never in scope for this review, and its proof passing
    // would not make it so. Reported rather than filtered — being sent one is the finding.
    if (entry.subject?.pubkey !== myPubkey) {
      problems.push({ kind: 'not-about-me', entry });
      return { entry, proven: false };
    }
    const proven = verifyInclusion(entry, proof, review.root);
    if (!proven) problems.push({ kind: 'entry-unproven', entry });
    return { entry, proven };
  });

  return { entries, problems, sound: recognised && problems.length === 0 };
}
