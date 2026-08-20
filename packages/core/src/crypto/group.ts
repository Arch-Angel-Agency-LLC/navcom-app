import { nip44 } from 'nostr-tools';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { SecretKey } from './keys.js';

/**
 * Sealing one payload so several people can read it.
 *
 * A box holds one Watchtower key. A squad with no box holds the watch on whichever phone is
 * awake, and hands it on — and until this existed, that meant every member sharing one
 * secret forever. Sharing a secret is not a membership model: nobody can be removed, adding
 * somebody means passing a key around again, and the only way to end it is to abandon the
 * Watchtower and re-provision everyone.
 *
 * ## How
 *
 * The payload is encrypted **once**, under a fresh random key. That key is then wrapped
 * separately for each holder. A squad of four costs one encryption and four wraps of 32
 * bytes each, not four encryptions of the whole message — which matters, because the
 * highest-volume thing on this wire is a heartbeat from a phone on a cheap plan.
 *
 * Nothing new is invented. The content key is an ordinary secp256k1 secret and every
 * encryption here is NIP-44 from nostr-tools, the reference implementation. This project
 * does not ship its own cryptography on a boundary protecting people at risk.
 *
 * ## What a relay can see, and what it cannot
 *
 * **No pubkeys appear in the envelope.** The wraps are an unlabelled list, and a reader
 * simply tries them until one opens — four attempts for a squad of four, which is nothing.
 * Labelling them by recipient would publish the squad roster to a public relay, which is
 * the same social-graph mistake `events/presence.ts` spends a throwaway key per message to
 * avoid.
 *
 * **The number of wraps is visible**, and that is stated rather than hidden: a relay can
 * count them and learn how many people hold a watch. It learns no identities and no names.
 * Padding the list to a fixed size would buy little and cost bytes on every message, so it
 * is not done — but if it ever matters, this is the file.
 *
 * A single-holder Watchtower produces **exactly the same shape** as a squad-held one, with a
 * list of length one. That is deliberate: two shapes would let anyone watching a relay sort
 * Watchtowers into "box" and "squad" without decrypting anything.
 *
 * ## Membership is not retroactive, and cannot be made so
 *
 * Removing somebody stops them reading **future** messages. Every message already sent was
 * sealed with a content key they were given, and no wording anywhere may imply otherwise.
 *
 * Normative source: docs/spec/signals.spec.md
 */

/**
 * Where a signal goes, and who can actually read it.
 *
 * These are two different things and conflating them is how a squad-held watch quietly
 * becomes readable by one key again. The `pubkey` is the **address** — the `p` tag a relay
 * routes on, and the identity the watch signs as. `holders` is **who holds the watch**: one
 * key for a box, one per phone for a squad.
 *
 * It is a type rather than two parameters so that passing an address where a holder list
 * belongs is a compile error. The same reasoning as `CompleteLog`: a rule the compiler
 * enforces is a rule, and one written in a comment is a hope.
 */
export interface WatchtowerAddress {
  /** The `p` tag. What a relay routes on. */
  pubkey: string;
  /** Whose keys the payload is sealed to. Never empty. */
  holders: readonly string[];
}

/**
 * A Watchtower address.
 *
 * With no holders given, the address is its own holder — the box case, where the node holds
 * the Watchtower key itself. A squad passes the member list.
 */
export function watchtowerAt(pubkey: string, holders?: readonly string[]): WatchtowerAddress {
  return { pubkey, holders: holders?.length ? holders : [pubkey] };
}

/** Version tag, so a future format change is a refusal rather than a misparse. */
const V = 1;

interface Envelope {
  v: number;
  /** The payload, encrypted once under the content key. */
  c: string;
  /** The content key, wrapped for each holder. Unlabelled, and in no meaningful order. */
  k: string[];
}

export class GroupSealError extends Error {}

/**
 * Derives the key a content-encrypted payload uses.
 *
 * The content key acts as both halves of its own conversation, so anybody holding it can
 * decrypt without needing to know who sent the message. That matters for handover: a member
 * who joins mid-shift can be given a content key by another member, and it works without
 * reference to the original sender.
 */
const contentKeyFor = (secret: SecretKey): Uint8Array =>
  nip44.getConversationKey(secret, getPublicKey(secret));

/**
 * Seals a payload to every holder.
 *
 * `recipients` is the holder list — one pubkey for a box, one per phone for a squad. An
 * empty list throws rather than producing a message nobody can read, which is the kind of
 * silent failure that turns into an unanswered `Distress`.
 */
export function sealToGroup(
  secret: SecretKey,
  recipients: readonly string[],
  payload: unknown
): string {
  if (recipients.length === 0) {
    throw new GroupSealError('Nobody to seal to — a message no one can read is not a message.');
  }

  const contentSecret = generateSecretKey();
  const envelope: Envelope = {
    v: V,
    c: nip44.encrypt(JSON.stringify(payload), contentKeyFor(contentSecret)),
    k: recipients.map((to) =>
      nip44.encrypt(bytesToHex(contentSecret), nip44.getConversationKey(secret, to))
    )
  };
  return JSON.stringify(envelope);
}

/**
 * Opens a group-sealed payload, or throws.
 *
 * Tries each wrap in turn. A wrap that is not ours fails to decrypt, which is indisputable
 * and cheap — there is no oracle here to be careful about, because every holder is entitled
 * to know they are a holder.
 */
export function openFromGroup<T = unknown>(
  secret: SecretKey,
  senderPubkey: string,
  envelopeJson: string
): T {
  let envelope: Envelope;
  try {
    envelope = JSON.parse(envelopeJson) as Envelope;
  } catch {
    throw new GroupSealError('Not a sealed envelope.');
  }
  if (!envelope || envelope.v !== V || !Array.isArray(envelope.k) || typeof envelope.c !== 'string') {
    throw new GroupSealError('Not a sealed envelope this version understands.');
  }

  const conversation = nip44.getConversationKey(secret, senderPubkey);
  for (const wrapped of envelope.k) {
    let contentSecret: SecretKey;
    try {
      contentSecret = hexToBytes(nip44.decrypt(wrapped, conversation));
    } catch {
      // Not our wrap. Expected for every holder but one, on every message.
      continue;
    }
    return JSON.parse(nip44.decrypt(envelope.c, contentKeyFor(contentSecret))) as T;
  }
  throw new GroupSealError('Not addressed to us.');
}

/**
 * Whether a string looks like a group envelope rather than a plain NIP-44 ciphertext.
 *
 * Needed only while both formats exist on the wire. Watchtower-directed traffic is always
 * group-sealed; peer presence and invites have exactly one recipient by construction and
 * stay direct, because wrapping a key for one person you already encrypted to is pure
 * overhead on the highest-volume messages in the system.
 */
export const isGroupEnvelope = (content: string): boolean =>
  content.startsWith('{') && content.includes('"v"');
