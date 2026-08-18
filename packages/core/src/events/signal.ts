/**
 * Signals — kinds 20910 and 20911.
 *
 * Structured, terse and defined: a protocol rather than a chat. Every signal has a shape, a
 * responder and a response window, which is what makes it faster to send under stress and
 * impossible to turn into a feed.
 *
 * Normative source: docs/spec/signals.spec.md
 */

import { seal } from '../crypto/envelope.js';
import type { SecretKey } from '../crypto/keys.js';
import { KIND_DISTRESS, KIND_SIGNAL, tagRecipient, tagSignalType, type SignalType } from './kinds.js';

export interface Position {
  lat: number;
  lon: number;
  precision_m: number;
}

export interface OnStationPayload {
  /**
   * How the board displays this operator. Optional on the wire, and a daemon falls back to
   * a short deterministic label from the pubkey when it is absent.
   *
   * The spec originally omitted it, and the board then had no way to show a name at all —
   * caught by the daemon implementation rather than by review.
   */
  callsign?: string;
  /** Coarse — a district, never an address. */
  area: string;
  expected_duration: number;
  /** Null disables routine check-ins. It never implies anything about safety. */
  routine_interval: number | null;
  share_position: boolean;
  position: Position | null;
}

export interface QueryPayload {
  text: string;
  area?: string;
}

export interface AssistPayload {
  /**
   * Optional on purpose. An assist with no text still means "I need someone" — requiring a
   * reason would delay a send at the moment sending matters, and the watch can ask.
   */
  text?: string;
  area?: string;
  /**
   * How long the watch has. Required, because "I need someone" and "I need someone now"
   * ask for different responses and the watch cannot tell them apart from silence.
   *
   * One tap, not a sentence — which is why this stays required where `text` does not.
   */
  urgency: 'soon' | 'now';
}

export interface DistressPayload {
  /** Last known position if the operator shares it; otherwise `area` carries what is known. */
  position: Position | null;
  /** Coarse. Present even when position is null, so a responder has somewhere to start. */
  area: string | null;
  text?: string;
}

/**
 * How long a client keeps retrying a `Distress` that has not been acknowledged.
 *
 * The spec says retry indefinitely with backoff, and that requirement is what makes an
 * ephemeral transport acceptable here at all: relays do not store these events, so a single
 * failed publish is a signal nobody ever receives.
 *
 * Implemented by `sendDistressUntilAcknowledged` in transport.ts, which stops only when a
 * human acknowledges or the operator cancels — never on its own.
 */
export const DISTRESS_RETRY_FOREVER = true;

export type SignalPayload =
  | OnStationPayload
  | QueryPayload
  | AssistPayload
  | Record<string, never>;

/** Response windows, in seconds. Surfaced to the operator rather than hidden. */
export const RESPONSE_WINDOW: Record<SignalType | 'distress', number | null> = {
  'on-station': 60,
  routine: 60,
  query: 120,
  assist: 300,
  'stood-down': 60,
  distress: null
};

export function buildSignal(
  secret: SecretKey,
  watchtowerPubkey: string,
  type: SignalType,
  payload: SignalPayload,
  createdAt: number
) {
  return {
    kind: KIND_SIGNAL,
    created_at: createdAt,
    // The type is an unencrypted tag so a client can filter without decrypting; the payload
    // is sealed to the Watchtower key.
    tags: [tagRecipient(watchtowerPubkey), tagSignalType(type)],
    content: seal(secret, watchtowerPubkey, payload)
  };
}

/**
 * Distress gets its own kind so it is never queued behind routine traffic.
 *
 * It is **always deliberate** — never inferred from silence, a missed window or inactivity
 * [invariant 3]. Nothing in this module can construct one from a timer, and nothing should
 * be added that can.
 */
export function buildDistress(
  secret: SecretKey,
  watchtowerPubkey: string,
  payload: DistressPayload,
  createdAt: number
) {
  return {
    kind: KIND_DISTRESS,
    created_at: createdAt,
    // No `t` tag: distress is identified by its kind, not by a filterable label, so it
    // cannot be missed by a subscriber filtering on signal types.
    tags: [tagRecipient(watchtowerPubkey)],
    content: seal(secret, watchtowerPubkey, payload)
  };
}
