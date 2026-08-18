/**
 * Responses — kind 20912.
 *
 * Every signal gets one, even if it is only receipt. **Silence is never an answer.**
 *
 * Normative source: docs/spec/signals.spec.md
 */

import { seal } from '../crypto/envelope';
import type { SecretKey } from '../crypto/keys';
import { KIND_RESPONSE, tagInReplyTo, tagRecipient } from './kinds';

export type ResponseType = 'ack' | 'answer' | 'escalation-status';

/** Which record an answer came from, verified when, and how. */
export interface Provenance {
  record_id: string;
  verified: string | null;
  method: string | null;
}

export interface ResponsePayload {
  type: ResponseType;
  responder: string;
  /** MUST be accurate. An operator must never be uncertain whether they are talking to a person. */
  responder_kind: 'human' | 'agent';
  text: string | null;
  /** Present on any directory-derived answer. Absent means the client must render unverified. */
  provenance: Provenance | null;
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
