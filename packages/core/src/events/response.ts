/**
 * Responses — kind 20912.
 *
 * Every signal gets one, even if it is only receipt. **Silence is never an answer.**
 *
 * Normative source: docs/spec/signals.spec.md
 */

import { seal } from '../crypto/envelope.js';
import type { SecretKey } from '../crypto/keys.js';
import type { Author } from '../attestation.js';
import { KIND_RESPONSE, tagInReplyTo, tagRecipient } from './kinds.js';

export type ResponseType = 'ack' | 'answer' | 'escalation-status';

/** Which record an answer came from, verified when, and how. */
export interface Provenance {
  record_id: string;
  verified: string | null;
  method: string | null;
}

export interface ResponsePayload {
  type: ResponseType;
  /**
   * Who answered — an author, not a name the node picked.
   *
   * `kind` MUST be accurate: an operator must never be uncertain whether they are talking
   * to a person. Where `sig` is absent, the Watchtower is speaking on the responder's
   * behalf, and a consumer may treat that as weaker than a signed answer.
   */
  responder: Author;
  text: string | null;
  /** Present on any directory-derived answer. Absent means the client renders unverified. */
  provenance: Provenance | null;
  /** Hex signature by `responder`, where they signed for themselves. */
  sig?: string;
}

export function buildResponse(
  secret: SecretKey,
  operatorPubkey: string,
  inReplyTo: string,
  payload: ResponsePayload,
  createdAt: number
) {
  return {
    kind: KIND_RESPONSE,
    created_at: createdAt,
    tags: [tagRecipient(operatorPubkey), tagInReplyTo(inReplyTo)],
    content: seal(secret, operatorPubkey, payload)
  };
}

/**
 * How a client must present an answer.
 *
 * An answer without provenance renders as **unverified** — not as a plain answer with a
 * missing badge. A confident wrong answer at 10pm is the worst failure available to this
 * system, and it is worse coming from an agent because it carries unearned authority.
 */
export function isUnverified(payload: ResponsePayload): boolean {
  return payload.type === 'answer' && payload.provenance === null;
}
