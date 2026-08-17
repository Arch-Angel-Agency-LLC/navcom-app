# Escalation — Spec

Normative and **safety-critical**. Test the failure paths, not the happy path.

The guarantee: **`Distress` terminates in a human, or the operator is told it couldn't**
[C24, C42, invariant 2]. The ladder is allowed to fail. It is never allowed to fail
silently.

## Ownership

**The watch state machine owns the ladder. The agent is not in the path.**

The executor MUST be a separate process from the agent, and MUST NOT call it, wait on it,
or route through it. A degraded, hung, or hostile agent MUST NOT impair escalation in any
way — this is what makes the safety guarantee structural rather than a promise from an
entity whose alignment is unverifiable.

## Trigger

Only a `20911` Distress event. Never a timer, a missed window, an overdue, or an agent's
assessment [invariant 3].

Escalation is not a decision. No component — human or agent — chooses whether to run the
ladder; receipt of the event runs it.

## The ladder

```
                    ┌─────────────┐
  distress ────────►│   PAGING    │ page ALL on-call, in parallel
                    └──────┬──────┘
                           │ 300s, no ack
                           ▼
                    ┌─────────────┐
                    │   CONTACT   │ operator's emergency contact, if set
                    └──────┬──────┘
                           │ 300s, or none set
                           ▼
                    ┌─────────────┐
                    │  EXHAUSTED  │ tell the operator plainly
                    └─────────────┘

  any state ──ack──► ACKNOWLEDGED (ladder stops; human has it)
```

**Paging is parallel, not serial.** Every on-call operator is paged simultaneously. In an
emergency you want everyone, and a serial walk down a roster wastes the only resource that
matters.

## States

| State | Action | Window |
|---|---|---|
| `PAGING` | Page all on-call via each registered channel | 300s |
| `CONTACT` | Operator's emergency contact — device-initiated where the phone responds, node-initiated where opted in | 300s |
| `EXHAUSTED` | Report failure to the operator | terminal |
| `ACKNOWLEDGED` | Stop. A human has it | terminal |

*Windows configurable.*

**Acknowledgement** means a human explicitly accepting — a tap, a reply, an answered call.
Delivery receipts, read receipts, and app-open events MUST NOT count. Someone whose phone
buzzed is not someone who woke up.

## Reporting

The operator MUST receive a `20912` on **every** transition [C42]:

- `"paging 2 on-call"`
- `"no answer — trying your emergency contact"`
- `"couldn't reach anyone"`
- `"Raven is responding"`

`EXHAUSTED` MUST reach the operator's own device even with no watch and no network — a
local fallback message. An operator who knows nobody is coming can act on that.

## Paging channels [C40]

Registering a channel is a **condition of the on-call role**. An operator without one is
not on-call.

| Channel | Notes |
|---|---|
| SMS | Node-initiated. Requires a stored number [opt-in] |
| Push | Third-party provider. Metadata exposure disclosed at registration |
| Voice call | Node-initiated. Requires a stored number [opt-in] |
| Console-open | Only counts while the console is actually open and focused |

`console-open` MUST NOT be offered as a sole channel to someone going to sleep. If it is
the only registered channel, the node treats the roster as empty for paging purposes and
says so.

## Emergency contact

- Encrypted at rest; decryptable **only** during an active escalation [C39]
- Used for escalation and nothing else — never notifications, never verification
- Revocable, verifiably
- **Device-initiated preferred**: the terminal sends it from the operator's own phone, so
  no number need be stored anywhere. Node-initiated is the opt-in fallback for when the
  operator can't act

## Drills [C29]

Unannounced, scheduled, and published.

- Frequency: weekly, randomised within the window
- Exercises `PAGING` end-to-end with a clearly-marked test payload
- Records: paged count, acknowledgement count, time to first ack, result
- **Published** to the public status page

A drill MUST be distinguishable from a real distress by the recipient. Producing alarm
fatigue in the name of testing would defeat the purpose.

**A watch that cannot demonstrate a passing drill is presumed broken**, and the watch
state degrades until one passes. Concretely: `10910` carries `last_drill`, and
`automated-oncall` publishes as `automated` while the last drill failed or none has run.
See [`watch-state.spec.md`](./watch-state.spec.md).

Result language: `no evidence of failure` — never `verified` [C32]. A passing drill means
the path worked this time.

## Failure modes to test

Not optional — these are the point of the spec:

1. No on-call registered → straight to `CONTACT`, then `EXHAUSTED`, operator told
2. On-call registered, nobody acknowledges → `CONTACT`
3. Acknowledged then nothing happens → ladder stopped; **known limitation, documented**
4. Node down at time of distress → device-local `EXHAUSTED` message fires
5. Operator has no emergency contact → `EXHAUSTED` reached faster, still reported
6. Agent degraded → escalation MUST still fire; it is the one path that cannot depend on
   agent health
7. Duplicate distress → single ladder, not two
