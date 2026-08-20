/**
 * Event kinds.
 *
 * Chosen so that live traffic is unstored and current watch state is retrievable by a
 * client that has just connected.
 *
 * Normative source: docs/spec/signals.spec.md
 */

/** Replaceable. Watch state — a cold client MUST be able to read this before signing on. */
export const KIND_WATCH_STATE = 10910;

/** Ephemeral. Peer-to-peer presence, wrapped so no relay can see who talks to whom. */
export const KIND_PEER_PRESENCE = 20913;

/**
 * Replaceable. An operator's public card — the one artifact they choose to be findable by.
 *
 * Signed by a **contact key**, never the operational one. See `events/public.ts` for why
 * that separation is load-bearing rather than tidy.
 */
export const KIND_CARD = 10911;

/**
 * Replaceable. An operator's ML-KEM-768 public key.
 *
 * Published rather than exchanged in person because it is 1184 bytes and a pairing code is
 * 32 — see `events/key-bundle.ts` for why that difference decides it.
 */
export const KIND_KEY_BUNDLE = 10912;

/**
 * Ephemeral. *"Raven is out tonight."* A name and a region, and nothing else ever.
 *
 * Also signed by the contact key, so it is verifiably the same Raven whose card is up
 * without exposing the key their peers address.
 */
export const KIND_PUBLIC_PRESENCE = 20914;

/**
 * Regular, and therefore **stored** — the one thing here a relay is meant to keep.
 *
 * An invite has to wait for somebody who is asleep. Everything else in this system is
 * ephemeral because a queryable history is the failure mode [C27]; an invite is the
 * exception because a request that expires in sixty seconds is not a request.
 */
export const KIND_INVITE = 1910;

/** Ephemeral. Signals: on-station, routine, query, assist, stood-down. */
export const KIND_SIGNAL = 20910;

/** Ephemeral. Distress — its own kind so it is prioritised independently of routine traffic. */
export const KIND_DISTRESS = 20911;

/** Ephemeral. Responses: acknowledgements and answers. */
export const KIND_RESPONSE = 20912;

/**
 * Ephemeral kinds (20000–29999) are not expected to be stored by relays. That is
 * load-bearing rather than incidental: the board must never become a queryable history
 * [C27].
 */
export const isEphemeral = (kind: number): boolean => kind >= 20000 && kind <= 29999;

export const SIGNAL_TYPES = [
  'on-station',
  'routine',
  'query',
  'assist',
  'stood-down',
  /**
   * "Show me what you have written about me" [C33].
   *
   * A signal rather than a new kind, because it is an ordinary request to the watch with an
   * ordinary answer — and the kind table stays at four. Note there is no subject field to
   * ask with: the node answers about whoever signed the request, so asking for somebody
   * else's record is not a permission the payload can express.
   */
  'log-review',
  /**
   * "I have this" — an on-call human accepting a `Distress`, and the only thing that stops
   * the ladder.
   *
   * A signal rather than a new kind: it is a message to the watch like any other. It MUST
   * be an explicit act by a person. A delivery receipt, a read receipt or an app-open event
   * MUST NOT be routed into it — someone whose phone buzzed is not someone who woke up.
   */
  'distress-ack'
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

/** The signal type travels as an UNENCRYPTED `t` tag so a client can filter without decrypting. */
export const tagSignalType = (t: SignalType): [string, string] => ['t', t];
export const tagRecipient = (pubkey: string): [string, string] => ['p', pubkey];
export const tagInReplyTo = (eventId: string): [string, string] => ['e', eventId];

export function readTag(tags: string[][], name: string): string | undefined {
  return tags.find((t) => t[0] === name)?.[1];
}
