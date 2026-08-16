# Watch State — Spec

Normative. Board model, lifetimes, overdue detection, handover.

## Watch state event — `10910`

Replaceable, published by the node, unencrypted. A cold client MUST be able to read this
before signing on [C23, invariant 4].

```json
{
  "state": "station | automated-oncall | automated | dark",
  "holder": "callsign | null",
  "holder_kind": "human | agent | null",
  "oncall_count": 2,
  "since": 1755300000,
  "agent_health": "ok | degraded | down"
}
```

- `holder_kind` MUST be accurate. An agent MUST NOT be published as `human` [C25]
- `agent_health: degraded` MUST NOT be published as `ok`. A degraded agent presenting as
  working is the failure this field exists to prevent
- When the node is unreachable, clients render **`dark`** — absence of the event is not
  ambiguity, it is Dark

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
status          active | overdue | distress | stood-down
```

### Lifetimes

*Configurable; defaults given.*

| | Default | Behaviour |
|---|---|---|
| Routine interval | 3600s | Set by operator at sign-on; `null` disables |
| Overdue grace | 1800s | Past `expected_until`, or past `routine_due` |
| Hard expiry | `expected_until + 14400s` | Entry is dropped regardless of state |
| Distress hold | Until human closure | A `distress` entry MUST NOT expire automatically |

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
timestamp · actor callsign · actor_kind · action · subject operator · outcome
```

Actions: `took-watch`, `handed-over`, `acked`, `answered`, `marked-overdue`,
`contacted`, `escalated`, `drill-run`, `drill-result`.

- MUST NOT contain positions, areas, or query text
- Each operator MUST be able to review entries where they are the subject [C33]
- Retained 90 days by default, *configurable*
- Agent actions logged including **inaction** — an overdue that passed without contact is
  an entry

An operator reviewing a watch sees: *acknowledged your sign-on 21:04, answered your query
22:41, no escalation.* Not a movement history.
