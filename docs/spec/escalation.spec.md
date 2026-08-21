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

### A pager does not need the key

A `20911` is addressed to the Watchtower, so **anyone watching the relays can see that a
Distress arrived without being able to read a byte of it.**

That means the *wake somebody up* half of escalation can be run by a process that holds no
key at all — a cheap always-on machine anywhere, run by anyone, learning nothing about any
operator, any position or any question. Several MAY run at once; duplicate pages are a
nuisance and a missed page is not.

A keyless pager is a **supplement, never a replacement.** It cannot tell the operator
anything, and invariant 2 requires that they be told. Reporting stays with a keyed executor.

**And the keyed executor MUST get its trigger from the relays, not from the daemon.** A design where the
daemon receives the `20911` and hands it to the executor satisfies "separate process" on
paper while leaving a hung daemon able to take escalation down with it — the requirement
failing in exactly the way it was written to prevent. The executor subscribes on its own.

The cost is that two processes hold the Watchtower key, doubling where it lives. That is
accepted: the alternative is an escalation path depending on the availability of the
component most likely to hang. Run them under **separate supervisor units** — sharing one
means a crash loop in either restarts the other, and the separation becomes a comment.

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
| *(skipped)* | An empty pageable roster MUST go straight to `CONTACT`, and with no contact either, straight to `EXHAUSTED`. Waiting out a window with nobody on the other end is five minutes the operator does not have, and it looks identical to a ladder that is working | — |
| `CONTACT` | Operator's emergency contact — device-initiated where the phone responds, node-initiated where opted in | 300s |
| `EXHAUSTED` | Report failure to the operator | terminal |
| `ACKNOWLEDGED` | Stop. A human has it | terminal |

*Windows configurable.*

**Acknowledgement** means a human explicitly accepting — a tap, a reply, an answered call.
Delivery receipts, read receipts, and app-open events MUST NOT count. Someone whose phone
buzzed is not someone who woke up. On the wire this is a `distress-ack` signal
[`signals.spec.md`](signals.spec.md).

An acknowledgement from outside the on-call roster MUST be refused and logged. Strictness is
the safe direction here: a ladder that keeps paging is survivable, and one stopped by
somebody who is not coming is not.

A ladder that has already reached `EXHAUSTED` still accepts an acknowledgement. Somebody
arriving late is still somebody arriving.

## Reporting

The operator MUST receive a `20912` on **every** transition [C42]:

- `"paging 2 on-call"`
- `"no answer — trying your emergency contact"`
- `"couldn't reach anyone"`
- `"Raven is responding"`

`EXHAUSTED` MUST reach the operator's own device even with no watch and no network — a
local fallback message. An operator who knows nobody is coming can act on that.

**This one is the client's job, and it is the only part of the ladder the node cannot report
on**, because the case it covers is the node being gone. The client concludes it from time
alone: past the ladder's whole budget (`paging + contact`, 600s by default) a working watch
would already have said something, so silence means there is no working watch.

It is a **message, not a state**. The client MUST keep retrying — only the operator ends a
`Distress` — and MUST say it once rather than repeating it.

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

**A channel names what was registered; the node owns the mechanism.** No provider is
embedded — the node runs a configured command per on-call entry, as argv rather than a shell
string so nothing in a payload can become a command. Embedding a provider would put a third
party in the one path that must not depend on anybody's uptime but the node operator's own.

Registering a channel is a **condition of the role**, enforced at startup: an on-call entry
with no way to wake anyone is refused rather than paged into nothing and then reported as
paged.

**A dispatch that failed MUST be reported as a failure.** A command exiting non-zero — a dead
gateway, a missing binary — means nobody was woken, and the operator MUST NOT be told
`"Paging Wren."` when that happened. The ladder's own sentence describes the state machine,
which cannot see a command's exit status; the node adds what only it knows.

## Paging budget

A watch MUST bound how many pages it will dispatch in a window.

The watch's address is **meant to be handed out**, so anybody holding it can publish a signed
`20911` from a key created a second ago. Unbounded, this pages a real person once per event —
and a pager that has cried wolf four hundred times is not answered on the night it is real.
Alarm fatigue is the failure mode that destroys escalation outright, so it is bounded here
rather than left to a relay or an operator's patience.

Past the budget the node MUST still open the ladder and MUST still report to the operator,
and the report MUST say plainly that nobody could be paged. **The ladder is allowed to fail;
it is never allowed to fail silently** [invariant 2]. Refusing to page while reporting
`"Paging Wren."` would be the invariant failing in exactly the way it forbids.

The bound is global rather than per-key: a flood already arrives from one fresh key per
event, so a per-key limit is free to defeat. Defaults are deliberately generous — 20 pages an
hour — so that a real night never reaches the limit and a flood passes it immediately.

Live ladders MUST NOT be dropped at any age. Terminal ladders MAY be dropped after a
retention window, which must be long enough that a late duplicate `20911` still finds the
finished ladder rather than starting a second one.

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
8. Flood of `20911` from unknown keys → paging bounded, **every** operator still told, and
   what they are told is that nobody could be paged
9. Every paging channel fails → operator told nobody was woken, not told they were paged
