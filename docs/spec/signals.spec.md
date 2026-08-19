# Signals — Spec

Normative. Wire format for field↔watch communication.

## Event kinds

Nostr kinds, chosen so that live traffic is unstored and current watch state is
retrievable by a client that just connected.

| Kind | Range | Name | Why |
|---|---|---|---|
| `10910` | replaceable | **Watch state** | A client opening cold MUST be able to read who holds watch. Replaceable keeps only the latest per node |
| `20910` | ephemeral | **Signal** | `on-station`, `routine`, `query`, `assist`, `stood-down` |
| `20911` | ephemeral | **Distress** | Separate kind so clients and relays can prioritise it independently of routine traffic |
| `20912` | ephemeral | **Response** | Acknowledgements, query answers, escalation status |
| `20913` | ephemeral | **Peer presence** | Who is out, sent operator-to-operator with no watch involved |

Ephemeral kinds (20000–29999) are not expected to be stored by relays — required by
[C27], since the board MUST NOT become a queryable history.

## Encryption

Every payload here is sealed. Nothing readable crosses a relay, and a relay operator sees
routing metadata only [C36].

Peer presence (`20913`) is sealed to the operator's paired peers; everything else is sealed
to the **Watchtower**, not to whoever happens to be holding watch.
The event `p`-tags the Watchtower pubkey. See [`README.md`](./README.md) for why, and what
it costs.

Sealing to the *Watchtower* rather than to a person is what makes handover free: watch
changes hands without anything being re-encrypted, and a signal in flight during a handover
is still readable by whoever picks it up.

**One Watchtower may be held by more than one key.** A box holds one; a squad with no box
holds one key per phone [`bootstrap.spec.md`](bootstrap.spec.md). Both are supported, and
the wire format is the same either way:

- **One key** — NIP-44 to the Watchtower pubkey, directly
- **Several keys** — the payload is encrypted once under a fresh random key, and that key is
  wrapped separately for each member. The event still `p`-tags the Watchtower pubkey, so a
  sender needs the member list but a relay learns nothing extra

A client MUST NOT be required to know which arrangement is in use before it can send.
Discovering that a Watchtower is squad-held is part of being given its address in person,
the same conversation that already hands over the pubkey and the relay list.

**Membership changes are not retroactive.** Removing a member stops them reading *future*
signals. It cannot un-send what they could already read, and no wording anywhere may imply
otherwise.

## `20910` — Signal

```json
{
  "kind": 20910,
  "tags": [["p", "<watchtower-pubkey>"], ["t", "<signal-type>"]],
  "content": "<nip44( payload )>"
}
```

`signal-type` MUST be one of: `on-station` · `routine` · `query` · `assist` ·
`stood-down` · `log-review` · `distress-ack`

The type is an unencrypted tag so a client can filter without decrypting. This leaks
*that* a signal of a given type occurred, not its content. `distress` is deliberately not
in this set — it gets its own kind so its presence isn't inferable from tag traffic
patterns on `20910`.

### Payloads

**`on-station`**
```json
{
  "area": "string, coarse — neighbourhood or district, never an address",
  "expected_duration": 7200,
  "routine_interval": 3600,
  "share_position": false,
  "position": null
}
```
`position` MUST be null unless `share_position` is true. When present it is coarsened to
~500m by default.

**`routine`** — `{}`. Presence is the message.

**`query`**
```json
{ "text": "bed tonight, has a dog", "area": "string, coarse" }
```

**`assist`**
```json
{ "text": "string | absent", "area": "string, coarse", "urgency": "soon|now" }
```
- `urgency` MUST be present. "I need someone" and "I need someone now" ask for different
  responses, and a watch cannot tell them apart from an absent field. It is one tap
- `text` is **optional**, and this is deliberate: an assist with no text still means *I need
  someone*, and requiring a reason delays the send at the moment sending matters. The watch
  can ask. Named `text` rather than `need` so the same concept has the same name across
  `query`, `assist` and `distress`

**`log-review`** — *"show me what you have written about me"* [C33].
```json
{ "since": 1755300000, "limit": 50 }
```
Both optional. **There is no subject field, and that is the access control**: the node
answers about the pubkey that signed the request, so one operator asking for another's
record is not something the payload can express.

**`distress-ack`** — *"I have this."* The only thing that stops the escalation ladder.
```json
{ "distress_id": "<20911 event id>" }
```
- MUST be an explicit act by a person. A delivery receipt, a read receipt or an app-open
  event MUST NOT be routed into it — someone whose phone buzzed is not someone who woke up
- The executor MUST refuse an ack from a sender who is not on the on-call roster, and MUST
  log the refusal. A ladder that keeps paging is survivable; one stopped by somebody who is
  not coming is not
- An agent MUST NOT acknowledge [invariant 5]

**`stood-down`** — `{}`.

## `20913` — Peer presence

**The one kind that involves no watch at all.** An operator publishes it to the peers they
have paired with, and each peer's device draws its own picture of who is out.

```json
{
  "kind": 20913,
  "tags": [["p", "<peer-pubkey>"], ["p", "<another-peer>"]],
  "content": "<sealed( payload )>"
}
```

```json
{
  "callsign": "Wren",
  "status": "out | stood-down",
  "area": "string, coarse — or null",
  "until": 1755310000,
  "position": { "lat": 0, "lon": 0, "precision_m": 500 }
}
```

### Why a kind of its own rather than another `20910`

A `20910` is addressed to a Watchtower and a watch subscribes to all of them. Peer presence
is addressed to several operators and no watch. Overloading the signal kind would put peer
traffic in front of a watch that cannot decrypt it and has no business seeing that it
exists — so the separation is about who *receives* it, not about tidiness.

### Rules

- **Nobody holds this.** There is no server-side list. Each device keeps what it can decrypt
  and computes its own view, which expires on its own. It MUST NOT be persisted [C27]
- **Republished on a heartbeat**, at the same interval as `10910`. Relays do not store
  ephemeral events, so a peer whose app was closed has missed everything sent meanwhile —
  a heartbeat means they see the truth within one interval of opening, and nothing is left
  on a relay to correlate later
- **Absence is never evidence of safety.** A peer who stops publishing reads as **unknown**,
  never as *home* and never as *in trouble*. Same rule as a stale `10910` reading Dark, and
  the same reason: silence is a gap in knowledge, not a fact [invariant 3]
- Standing down MUST publish `status: stood-down` rather than simply stopping. Stopping is
  what a flat battery looks like
- `position` is present only where the operator chose to share it, at the precision they
  chose. **Live only, never a track** — a peer keeps the latest and nothing before it

### What this deliberately is not

Not a feed. A peer view is **current state**: who is out, roughly where, until when. A
history of where anyone has been is the thing the rules forbid outright, and the difference
between the two is one careless `push` in a client.

## `20911` — Distress

```json
{
  "kind": 20911,
  "tags": [["p", "<watchtower-pubkey>"]],
  "content": "<nip44( { \"position\": {...}|null, \"area\": \"string|null\", \"text\": \"string|absent\" } )>"
}
```

- MUST be sendable from a locked screen
- MUST be a deliberate action. MUST NOT be generated by a timer, missed window, or
  inactivity [C24, invariant 3]
- Carries last known position where the operator shares position; otherwise `area` carries
  the last declared area, so a responder always has somewhere to start
- Client MUST retry until acknowledged, with backoff, indefinitely. **Only the operator may
  end it** — a client that gives up after N attempts has failed silently, which invariant 2
  forbids. Every attempt is reported to the operator, including ones that never left the
  device

## `20912` — Response

```json
{
  "kind": 20912,
  "tags": [["p", "<operator-pubkey>"], ["e", "<signal-event-id>"]],
  "content": "<nip44( payload )>"
}
```

```json
{
  "type": "ack | answer | escalation-status | log-review",
  "responder": { "kind": "human | agent", "callsign": "...", "pubkey": "hex | absent" },
  "text": "string|null",
  "provenance": { "record_id": "...", "verified": "2026-08-14", "method": "in_person" }
}
```

- `responder.kind` MUST be present and accurate on every response [C25, invariant 5]
- A `log-review` response carries `review: { root, entries[{entry, proof}], more }`. The
  node MUST cap `entries` and set `more` rather than exceeding a relay's message size —
  a response too large to publish is silence, and silence is never an answer
- **A client MUST check `review.root` against a root it saw published itself.** Verifying
  the proofs against the root supplied beside them always succeeds, because the watch
  produced both. A client that renders that as verified has told the operator they checked
  something when they did not
- `provenance` MUST be present on any directory-derived answer [C32, H5]. An answer
  without provenance MUST render as unverified
- Every signal MUST receive at least an `ack`. Silence is never a response

## Acknowledgement windows

*Configurable; defaults given.*

| Signal | Target |
|---|---|
| `on-station`, `routine`, `stood-down` | ack within 60s |
| `query` | answer within 120s; ack within 30s if answer will take longer |
| `assist` | ack within 60s, resolution within 300s |
| `log-review` | answer within 120s. Not urgent — nobody is in the street waiting on it |
| `distress-ack` | 10s. One tap, and somebody is waiting on it as they are waiting on nothing else |
| `distress` | see [`escalation.spec.md`](./escalation.spec.md) |

A missed window is not an error condition. It is displayed to the operator as an
unanswered signal, and it degrades the visible watch state.

## What is NOT here

No free-text chat kind. No threading, no replies to responses, no message history [C2,
principle 2]. A signal is a transaction and it closes.
