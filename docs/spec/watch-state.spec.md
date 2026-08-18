# Watch State — Spec

Normative. Board model, lifetimes, overdue detection, handover.

## Watch state event — `10910`

Replaceable, published by the node, unencrypted. A cold client MUST be able to read this
before signing on [C23, invariant 4].

```json
{
  "v": 2,
  "state": "station | automated-oncall | automated | dark",
  "holder": "callsign | null",
  "holder_kind": "human | agent | null",
  "oncall": [
    { "author": { "kind": "human", "callsign": "Wren" },
      "channel": "sms", "expires": 1755310000, "sig": "hex | absent" }
  ],
  "since": 1755300000,
  "agent_health": "ok | degraded | down",
  "last_drill": {
    "at": 1755300000, "result": "pass | fail",
    "author": { "kind": "node" }, "acknowledged": []
  }
}
```

- `on-station` MUST carry `callsign`. The board has no other way to learn a human-readable
  name from a bare pubkey, and DoD check 3 requires the board entry to show one. Optional on
  the wire; a daemon falls back to a short deterministic label derived from the pubkey
- `holder_kind` MUST be accurate. An agent MUST NOT be published as `human` [C25]
- `agent_health: degraded` MUST NOT be published as `ok`
- When the node is unreachable, clients render **`dark`** — absence is not ambiguity, it is Dark
- **Staleness is also Dark, and this is the part that is easy to miss.** `10910` is
  *replaceable*, so a relay keeps serving the last published copy after the daemon has died.
  A client checking only for absence fetches that copy, reads `automated`, and tells an
  operator a watch exists when nothing is running — invariant 4 failing in the exact way it
  was written to prevent.
- A client MUST therefore treat an event older than `stale_after_seconds` as Dark, and MUST
  treat an event of unknown age as Dark rather than assuming it is fresh.
  `stale_after_seconds` is *configurable*, and should be a small multiple of the daemon's
  publish interval. The daemon MUST republish at that interval even when nothing changed

### On-call is a list of statements, not a count

**`oncall` is an array of authored declarations, and the count is derived from its length.**
A number can be inflated by whoever publishes it; a list of signed statements can only be
inflated by forging keys, so a consumer counts evidence rather than trusting a total.

- Only declarations that are **reachable right now** are published: unexpired, and not
  `console-open` standing alone [C40]
- When the reachable list is empty the state MUST be `automated`, never `automated-oncall`
- A failed or absent drill also demotes `automated-oncall` to `automated` — the on-call
  claim is exactly what a drill tests [C29]. `station` is never demoted: a human is present
  regardless

### The honest limit, stated in the spec rather than discovered later

**Everything here is currently authored by the node, about the node.** `agents.md` says
self-report grants nothing, and a Watchtower publishing its own capability is a self-report
by that same standard.

The shape does not assume it. `oncall[].sig` and `last_drill.acknowledged` exist and are
empty, so operators signing for themselves is an **additive** change rather than a payload
break. Until then, a consumer should read this as *what the Watchtower claims*, which is
weaker than *what is true* — and is still worth publishing, because a contemporaneous signed
claim makes a false one attributable.

**Gate:** counter-signing ships before the Watchtower pubkey goes to anyone who has not been
personally vetted. Inside a circle of people you trust directly, node self-report is
adequate; the moment it isn't, the shape is already there.

## Board entries

Held in memory on the node. **Live tier — never written to durable storage** [C27].

```
operator        pubkey
callsign        string
area            string, coarse
signed_on       timestamp
expected_until  timestamp
routine_due     timestamp | null
last_contact    timestamp
position        {lat, lon, precision_m} | null
status          active | overdue | distress
```

A `stood-down` signal is acknowledged and the entry is **removed** from the board.
Stand-down is not a status an entry rests in, which is why it is absent above — the board
holds who is out, and someone who has stood down is not out.

### Lifetimes

*Configurable; defaults given.*

| | Default | Behaviour |
|---|---|---|
| Routine interval | 3600s | Set by operator at sign-on; `null` disables |
| Overdue grace | 1800s | Past `expected_until`, or past `routine_due` |
| Hard expiry | `expected_until + 14400s` | Entry is dropped — **except** `status = distress` |
| Distress hold | Until human closure | A `distress` entry MUST NOT expire automatically, and MUST NOT be dropped by hard expiry |

Hard expiry exists so a forgotten sign-on doesn't linger on the board forever. It is not
a stand-down — the log records expiry, not a completed op.

## Overdue

On crossing overdue grace, the node MUST:

1. Mark `status = overdue`
2. Notify whoever holds watch
3. Attempt contact with the operator

It MUST NOT escalate, page, or trigger any part of the ladder [C4, invariant 3]. Only a
human reviewing an overdue may raise it. An agent MUST NOT close an overdue.

**Rationale, so nobody "improves" this:** people are late for ordinary reasons far more
often than dangerous ones, and false alarms train everyone to ignore real ones.

## Handover

```
station → station          named successor accepts; board state transfers intact
station → automated        explicit drop; agent assumes the board
any     → dark             node down or agent down with no human
```

Handover MUST transfer: all board entries, all unanswered signals, all overdue entries.
Watch MUST NOT be silently abandoned — a holder going offline without handover transitions
to `automated`, or to `dark` if the agent is unavailable.

## Shared watch [C28]

Exactly **one** holder has the board at a time and is the accountable party shown in
`10910`.

Additional operators MAY be registered as **query responders**. They receive `query`
signals, and their callsign appears as `responder` on answers they give. They hold no
board entries, receive no `distress`, and carry no escalation duty.

This lets an operator with deep local knowledge and no capacity for a full shift still
answer questions.

## Accountability log

**Separate from the board, and this distinction resolves the C27/C33 conflict.**

The board is Live and expires. The accountability log is append-only and retained. It
records **actions, never positions**:

```
at · actor{kind, callsign, pubkey} · action · subject{kind, callsign, pubkey} · outcome · prev · hash · countersig?
```

Actions: `took-watch`, `handed-over`, `acked`, `answered`, `marked-overdue`,
`contacted`, `escalated`, `drill-run`, `drill-result`.

- MUST NOT contain positions, areas, or query text
- Each operator MUST be able to review entries where they are the subject [C33]
- **`subject` is keyed on pubkey, never on callsign.** There is no registry, so callsigns
  are not unique — two operators may both be Raven, and matching on the name would show one
  person another's record. In the mechanism that holds the watch accountable, that is a
  correctness failure rather than a cosmetic one
- Retained 90 days by default, *configurable*
- Agent actions logged including **inaction** — an overdue that passed without contact is
  an entry

### The log is written by the party it holds accountable

That is a real hole, not a quibble: [the Hostile Watch](../research/ecosystem-roster.md) is
a named adversary whose stated mitigation is this log. A watch that can rewrite its own
record defeats it.

**Three** problems, and the middle one was missing from this table until an operator review
screen was designed against it:

| | |
|---|---|
| **Tampering** — editing history afterwards | **Closed for a whole-log reader.** Each entry hashes its content plus the previous hash, so an edit anywhere breaks every link after it |
| **Selective disclosure** — handing an operator a filtered view they cannot check | **Closed**, by inclusion proofs against a published root. A link points at the entry before it *in the full log*, which is usually about somebody else, so a filtered chain view can never verify — but a Merkle proof is `log₂(n)` sibling hashes and discloses nothing about anyone else |
| **Fabrication / omission** — a false entry written at the time, or a true one never written | **Not closed.** Only `countersig` — the subject signing that this is what happened to them — closes it, and nothing counter-signs yet |

**The middle row is the one that matters here**, because the operator is precisely the party
who cannot be given the whole log. The earlier version of this table said an operator
"can verify the chain without trusting whoever wrote it." That was wrong for a filtered
view, and the two library functions written to make it possible could not compose.

### `log_root` — the commitment

`10910` carries a Merkle root over the log, republished on the heartbeat:

```json
"log_root": { "root": "<hex sha256>", "size": 128, "at": 1755300000 }
```

- Structured as RFC 6962: leaves and internal nodes are domain-separated, and the tree
  splits at the largest power of two below `n` rather than duplicating a lone trailing leaf.
  Both are needed; the obvious implementation has neither and is forgeable
- A leaf is the entry's **stated** chain hash, so the root does not commit to readable
  content on its own. A verifier MUST recompute the entry's own hash before checking the
  path. The two are only sound together
- Null MUST be published when the node keeps no log. *"This watch commits to nothing"* is a
  fact an operator should be able to read
- It is a **checkpoint**, not a live value. An entry written since the last heartbeat is
  genuinely not covered, and `size` is what makes that legible rather than confusing

### Clients MUST keep the roots they have seen

`10910` is replaceable, so a relay serves only the newest. **A node that is the sole
custodian of the evidence against itself is not being held to anything.**

A client keeps its observations and reports three findings:

| | |
|---|---|
| `diverged` | Two different roots at the same tree size. **Nothing legitimate does this** — history was rewritten after being committed to |
| `shrank` | Fewer entries than a root already seen. Retention does this on a schedule; so does deletion |
| `stopped` | A watch that was committing to a log no longer is |

These are kept in the accruing tier and survive a panic wipe. A hash says nothing about
where anyone was, and the record is worth more the further back it goes.

**What none of this closes: omission.** A watch that never writes an entry publishes a root
over a tree that never contained it, and every proof still verifies. Only `countersig`
closes that, and the screen rendering a review must say so plainly.

The chain does not make a lie impossible and this spec does not pretend otherwise. Same gate
as `oncall`: counter-signing ships before the Watchtower opens past people personally
vetted.

### Retention breaks the chain, and the node declares where

Dropping entries past the retention window leaves the oldest survivor pointing at a hash
that no longer exists — indistinguishable from tampering. The node MUST record the dropped
tail's final hash as the **declared start**, and verification MUST be performed against it.
Without this the log accuses itself every 90 days.

A declared start MUST NOT be usable to launder an edited history: entries after it are still
chained, so an edit inside the retained window is still caught.

### `outcome` is a closed set, not free text

Free text is the one field through which an area, a position or a query text could reach a
log that MUST NOT contain any of them. No care at the call sites removes that channel; a
union does.

Two outcomes record **inaction**, which `agents.md` requires:

- `contact-not-attempted` — an operator went overdue and nothing tried to reach them
- `escalation-not-attempted` — a `Distress` arrived and no ladder ran

Both are distinct from their "tried and failed" counterparts on purpose. `escalation-
reached-nobody` claims an attempt; while the ladder is unbuilt, the true entry is
`escalation-not-attempted`, and it should read badly until it stops being true.

### A broken chain does not stop the watch

A node that finds its own log broken at boot MUST record the break permanently and **keep
holding the watch**. People's safety depends on the watch running, and a watch that refuses
to start because its record looks edited has turned an accountability failure into an
availability one — which is the trade a hostile watch would take every time.

An operator reviewing a watch sees: *acknowledged your sign-on 21:04, answered your query
22:41, no escalation.* Not a movement history.
