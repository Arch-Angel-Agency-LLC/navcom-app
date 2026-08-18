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

- `holder_kind` MUST be accurate. An agent MUST NOT be published as `human` [C25]
- `agent_health: degraded` MUST NOT be published as `ok`
- When the node is unreachable, clients render **`dark`** — absence is not ambiguity, it is Dark

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
at · actor{kind, callsign} · action · subject · outcome · prev · hash · countersig?
```

Actions: `took-watch`, `handed-over`, `acked`, `answered`, `marked-overdue`,
`contacted`, `escalated`, `drill-run`, `drill-result`.

- MUST NOT contain positions, areas, or query text
- Each operator MUST be able to review entries where they are the subject [C33]
- Retained 90 days by default, *configurable*
- Agent actions logged including **inaction** — an overdue that passed without contact is
  an entry

### The log is written by the party it holds accountable

That is a real hole, not a quibble: [the Hostile Watch](../research/ecosystem-roster.md) is
a named adversary whose stated mitigation is this log. A watch that can rewrite its own
record defeats it.

Two problems, closed separately and honestly:

| | |
|---|---|
| **Tampering** — editing history afterwards | **Closed.** Each entry hashes its content plus the previous hash, so an edit anywhere breaks every link after it. An operator reviewing entries about themselves can verify the chain without trusting whoever wrote it |
| **Fabrication** — a false entry written at the time | **Not closed.** Only `countersig` — the subject signing that this is what happened to them — closes it, and nothing counter-signs yet |

The chain does not make a lie impossible and this spec does not pretend otherwise. Same gate
as `oncall`: counter-signing ships before the Watchtower opens past people personally
vetted.

An operator reviewing a watch sees: *acknowledged your sign-on 21:04, answered your query
22:41, no escalation.* Not a movement history.
