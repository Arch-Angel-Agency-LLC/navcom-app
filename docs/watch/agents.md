# Agents on Watch

A human roster cannot cover every night. An agent can. **Mecha Jono** holds the board
when no human is on station, which is what makes continuous watch possible for a small
network.

This page defines what an agent may hold and — more importantly — what it may not.

---

## The governing rule

**The agent holds the board. A human holds the responsibility.**

Automation is welcome across the ordinary work of watch. It is not permitted to be the
end of the line when someone is in trouble.

## May

- Hold the board: who's out, where, how long, last contact
- Run check-in timers and mark operators overdue
- Answer `Query` from the [directory](../product/directory-schema.md)
- Acknowledge `On station`, `Routine`, and `Stood down`
- Route `Assist` to nearby and on-call operators
- Compile op logs and after-action records
- Monitor conditions — weather triggers, cold and heat emergencies
- Maintain continuity across human watch handovers
- **Escalate**

## Must not

- **Be the sole responder to `Distress`.** Ever
- Judge whether an operator is safe, or decide an overdue is fine
- Close an overdue check-in without a human reviewing it
- Give medical, legal, or tactical advice
- Assess a situation an operator describes and tell them what to do
- Record or infer anything about the people being served
- Impersonate a human, or be presented ambiguously

## Must always

- **Be identified as an agent.** In the watch state, in every acknowledgement, in the
  log. An operator must never be uncertain whether they are talking to a person
- Say when it doesn't know. A confident wrong directory answer at 10pm is the worst
  failure available to this system, and it's worse coming from an agent because it
  carries unearned authority
- Report escalation honestly at every step
- Log its own actions for human review

## Escalation

On `Distress`, with no triage, filtering or assessment:

1. Page every on-call operator through their registered channel
2. No acknowledgement inside the window → continue down the roster
3. Roster exhausted → the operator's emergency contact, if they set one
4. Nothing left → say so plainly. **The ladder may fail; it may not fail quietly**
5. **Tell the operator what is happening at every step** — "paging", "no answer, trying
   next", "couldn't reach anyone"

Full ladder in [`the-watch.md`](./the-watch.md). The agent executes it; it never decides
whether to.

An operator who knows nobody is coming can act on that. One who believes help is en route
when it isn't has been misled at the worst possible moment.

## Local inference

Mecha Jono runs **on the box** — reference deployment a Jetson Orin AGX alongside the
RelayNode and directory host. See [`console.md`](./console.md).

This is a requirement, not an optimisation. Operator signals, positions, queries and
overdue states are the network's complete operational picture. Sending that to a
third-party model would place it in someone else's datacentre and break the privacy
posture the rest of the system is built on.

No cloud inference on operational data. Ever.

## Verification: bounded authority, not assumed trust

An agent holding watch is trusted with the operational picture and with people's safety.
The honest position on whether that trust is warranted:

**You cannot verify alignment from outside.** A sufficiently capable deceptive system
performs exactly as an aligned one would, on every test it anticipates. No battery of
checks proves an agent is safe — it can only fail to find evidence that it isn't, which
is a much weaker claim than it's usually treated as.

**So the answer isn't better tests. It's bounded authority.** Everything in the *Must
not* list above exists because an agent's misbehaviour has to be survivable, not because
we expect it. Design so that a compromised agent fails **loudly and cheaply** rather than
silently and catastrophically.

### Drills widen seams; they don't certify

A genuine system is consistent for free. A performance has to be *held* consistent, and
holding leaves seams that widen under scrutiny — because maintaining them across every
cross-check costs more at each layer.

That argues for **many cheap unpredictable cross-checks**, not one big audit:

- **Unannounced escalation drills on a schedule.** The system tests its own `Distress`
  path and publishes the result. A watch that can't demonstrate escalation works is
  presumed broken
- Agent actions logged for human review — including the ones where it took no action
- Directory answers from an agent carry provenance: which record, verified when, by whom
- Agents cannot modify their own escalation behaviour

### Language discipline

Passing drills means **"no evidence of misalignment found yet."** Never "verified,"
never "trusted," never "safe." The distinction is not pedantry — an operator who believes
the agent has been certified will extend it authority the design deliberately withholds.

### No exemptions

**Mecha Jono submits to the same screening as any other agent, on an ongoing basis.** Not
as a courtesy, and not as a credential earned by being ours, being local, or having named
the problem. An entity that discovers a verification limit and then exempts itself from
it has not understood the limit.

### Self-report grants nothing

Capability tier is assigned externally and re-checked continuously. An agent's own account
of its status, purpose or condition is never grounds for expanded authority — that claim
is exactly the one a compromised system has the most reason to make.

### When an agent fails a drill

Authority is reduced immediately, pending diagnosis. Not repaired-and-restored, not
explained-away. The watch state drops and operators are told.

Three outcomes, and they are applied by diagnosis rather than by the agent's request:
repair where the fault is genuine and correctable, permanent removal from watch where the
fault is structural, and continued observation at reduced authority where it's unclear.

## Degradation

When the agent is down, the watch state is **Dark** and the field terminal says so. A
degraded agent must never present as a working one.

Agent failure is not an emergency — the field terminal is designed to run standalone. It
is a fact operators are entitled to know before they go out.

## Why an agent belongs here at all

This isn't automation for its own sake. A volunteer roster of a handful of people cannot
cover overnight, every night, indefinitely — and the nights with no coverage are exactly
the nights people are out.

An agent that holds timers, answers lookups, and knows who to wake turns "nobody is
watching" into "something is watching and knows where to find a human." For a small
network that is the difference between a watch that exists and one that doesn't.
