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

1. Wake the on-call human immediately
2. No answer inside the window → page the next on the roster
3. Roster exhausted → fall back to the operator's own SMS emergency contact
4. **Tell the operator what is happening at every step** — "paging", "no answer, trying
   next", "couldn't reach anyone, falling back to your contact"

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
