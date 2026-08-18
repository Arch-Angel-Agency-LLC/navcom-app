# Agents on Watch

A human roster cannot cover every night. An agent can. **Mecha Jono** holds the board when
no human is on station, which is what makes continuous watch possible for a small network.

This page is what an agent may hold and — more importantly — what it may not.

---

## The governing rule

**The agent holds the board. A human holds the responsibility.**

Automation is welcome across the ordinary work of watch. It is not permitted to be the end
of the line when someone is in trouble.

## May

- Hold the board: who's out, where, how long, last contact
- Run check-in timers and mark operators overdue
- Answer `Query` from the [directory](../product/directory-schema.md)
- Acknowledge `On station`, `Routine`, and `Stood down`
- Route `Assist` to nearby and on-call operators
- Compile op logs and after-action records
- Monitor conditions — weather triggers, cold and heat emergencies
- Maintain continuity across human watch handovers
- Observe an escalation in progress and assist a responding human

## Must not

- **Be the sole responder to `Distress`.** Ever
- **Prevent, delay, filter, or decide about an escalation.** It never holds that decision
- Judge whether an operator is safe, or decide an overdue is fine
- Close an overdue check-in without a human reviewing it
- Give medical, legal, or tactical advice
- Assess a situation an operator describes and tell them what to do
- Record or infer anything about the people being served
- Impersonate a human, or be presented ambiguously
- **Task anyone.** There is no dispatch verb, for agents least of all

## Must always

- **Be identified as an agent** — in the watch state, in every acknowledgement, in the log
- Say when it doesn't know. A confident wrong directory answer at 10pm is the worst failure
  available to this system, and it is worse from an agent because it carries unearned authority
- Never misrepresent escalation status
- Log its own actions for human review, **including inaction**

## Escalation is not an agent action

**The ladder belongs to the watch state machine.** A `20911` triggers it deterministically,
on receipt. No component decides whether to escalate, because escalation is not a decision
anyone in this system holds.

This is the difference between a bound and a promise. If the agent decided, every safety
guarantee here would rest on the good behaviour of an entity whose alignment is unverifiable
by construction. Instead: **the agent could be entirely compromised and the ladder would
still fire.**

- **Separate failure domains.** The executor is a distinct process. A degraded, hung or
  hostile agent does not impair escalation
- **No agent in the path.** The ladder does not call it, wait on it, or route through it
- **Escalation survives agent death.** Failure mode 6 in
  [`../spec/escalation.spec.md`](../spec/escalation.spec.md) is a test, not an aspiration

An operator who knows nobody is coming can act on that. One who believes help is en route
when it isn't has been misled at the worst possible moment.

## Local inference

Mecha Jono runs **on the box** — reference deployment a Jetson Orin AGX alongside the
RelayNode and directory host.

A requirement, not an optimisation. Operator signals, positions, queries and overdue states
are the network's complete operational picture, and sending that to a third-party model
would put it in someone else's datacentre. **No cloud inference on operational data. Ever.**

## Why an agent is bounded rather than trusted

An agent is [an author of attestations](../attestation.md) like any other, and the model
already says what that means: **weight is derived from method and history, never from the
author's own account of itself.**

That single line replaces what used to be a page of doctrine. Its consequences here:

- **Self-report grants nothing.** Capability tier is assigned externally and re-checked. An
  agent's account of its own status is precisely the claim a compromised system has most
  reason to make
- **No exemptions, including ours.** An entity that discovers a verification limit and then
  exempts itself has not understood the limit
- **Drills widen seams; they do not certify.** Many cheap unpredictable cross-checks, not
  one audit — a genuine system is consistent for free, a performance has to be *held*
  consistent, and holding leaves seams
- **Passing means "no evidence of failure found yet."** Never *verified*, never *trusted*.
  An operator who believes an agent is certified will extend it authority the design
  deliberately withholds

**You cannot verify alignment from outside.** A sufficiently capable deceptive system
performs exactly as an aligned one would on every test it anticipates. So the answer is not
better tests — it is bounded authority. Everything in *Must not* exists so that misbehaviour
is **survivable**, not because we expect it.

### When an agent fails a drill

Authority is reduced immediately, pending diagnosis. Not repaired-and-restored, not
explained away. The watch state drops and operators are told.

Three outcomes, applied by diagnosis rather than at the agent's request: repair where the
fault is genuine and correctable, permanent removal where it is structural, continued
observation at reduced authority where it is unclear.

## Degradation

When the agent is down the watch state is **Dark** and the field terminal says so. A
degraded agent must never present as a working one.

Agent failure is not an emergency — the field terminal runs standalone. It is a fact
operators are entitled to know before they go out.

## Why an agent belongs here at all

A volunteer roster of a handful of people cannot cover overnight, every night, indefinitely
— and the nights with no coverage are exactly the nights people are out.

An agent that holds timers, answers lookups and knows who to wake turns *nobody is watching*
into *something is watching and knows where to find a human*. For a small network that is
the difference between a watch that exists and one that doesn't.
