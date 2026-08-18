/**
 * Signals — kinds 20910 and 20911.
 *
 * Structured, terse and defined: a protocol rather than a chat. Every signal has a shape, a
 * responder and a response window, which is what makes it faster to send under stress and
 * impossible to turn into a feed.
 *
 * Normative source: docs/spec/signals.spec.md
 */

import { seal } from '../crypto/envelope';
import type { SecretKey } from '../crypto/keys';
import { KIND_DISTRESS, KIND_SIGNAL, tagRecipient, tagSignalType, type SignalType } from './kinds';

export interface Position {
  lat: number;
  lon: number;
  precision_m: number;
}

export interface OnStationPayload {
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
  text: string;
  area?: string;
}

export interface DistressPayload {
  /** Last known position if the operator shares it; otherwise last known area. */
  position: Position | null;
  area: string | null;
  text?: string;
}

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
