/**
 * The attestation — the one object this system is built from.
 *
 * A claim, plus who made it, plus how they know, plus what that is worth. Signed, and
 * checkable without anyone's permission. See docs/attestation.md.
 *
 * The type is generic in both the claim and the method vocabulary, because the *shape* is
 * universal while the ways of knowing are not: a directory entry is known in person or by
 * phone; a watch capability is measured. Each subject supplies its own methods and its own
 * decay windows, and gets the same guarantees in return.
 */

/** Who made a claim. Never a legal name [H3]. */
export interface Author {
  /** Hex pubkey, where one exists. */
  pubkey?: string;
  /** Callsign, or `anonymous`. */
  callsign?: string;
  /** Must be accurate. An agent is never published as human [C25]. */
  kind: 'human' | 'agent' | 'node';
}

/**
 * What a claim is worth. **Derived, never stored and never asserted by the author** — that
 * is the whole point. An author cannot tell you how much to trust them.
 */
export type Weight = 'high' | 'medium' | 'low' | 'stale' | 'suspect';

export interface Attestation<Claim, Method extends string = string> {
  claim: Claim;
  author: Author;
  /** How the author knows. */
  method: Method;
  /** ISO 8601. When the author established it, not when they published it. */
  at: string;
  /** Hex signature over the claim, where the transport does not already carry one. */
  sig?: string;
}

/** How much each way of knowing is worth, before age is considered. */
export type MethodWeights<M extends string> = Record<M, Exclude<Weight, 'stale' | 'suspect'>>;

export interface DeriveOptions {
  /** Days after which this claim is stale regardless of method. */
  staleAfterDays: number;
  /**
   * Extra days of slack, for a reader who may be holding an old copy. Errs toward `stale`
   * rather than toward a confident answer, which is the safe direction.
   */
  marginDays?: number;
  /** A counter-claim by someone else. Overrides everything, including a fresh check. */
  disputed?: boolean;
}

/** Whole days between an ISO date or datetime and `now`. */
export function ageInDays(at: string, now: Date): number {
  const then = Date.parse(at.length === 10 ? `${at}T00:00:00Z` : at);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const thenDay = Date.parse(`${new Date(then).toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.floor((today - thenDay) / 86_400_000);
}

/**
 * Weight from method and age. The generic form of the directory's confidence model.
 *
 * A disputed claim is `suspect` no matter how it was established. A claim past its window
 * is `stale` no matter how well. Otherwise the method decides.
 */
export function deriveWeight<M extends string>(
  attestation: Pick<Attestation<unknown, M>, 'method' | 'at'>,
  weights: MethodWeights<M>,
  now: Date,
  opts: DeriveOptions
): Weight {
  if (opts.disputed) return 'suspect';
  if (!attestation.at) return 'stale';

  const age = ageInDays(attestation.at, now) + (opts.marginDays ?? 0);
  if (age > opts.staleAfterDays) return 'stale';

  return weights[attestation.method] ?? 'stale';
}

/**
 * Absence is information, not a gap.
 *
 * No attestation means *nobody has established this* — which is a different fact from a
 * negative claim, and the difference decides behaviour. A blank intake field means nobody
 * asked; it never means there is no restriction.
 */
export type Known<T> = { known: true; value: T } | { known: false };

export const unknown = <T>(): Known<T> => ({ known: false });
export const known = <T>(value: T): Known<T> => ({ known: true, value });
