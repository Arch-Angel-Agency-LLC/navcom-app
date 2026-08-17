# Specs

**Normative.** Where these and the narrative docs disagree, the spec wins and the
narrative is a bug.

## Scope

Specs exist **only for the MVP surface**:

> One operator signs on from a phone. The agent sees them on the board. The operator sends
> `Query`. An answer comes back.

`Distress` and the escalation ladder are specified too, despite sitting outside that loop,
because they are safety-critical and must never be improvised later.

Everything else — endorsements, presets, funding, recovery, propagation, allied interop —
is deliberately unspecified. Specs written before the loop is proven are guesses in a more
confident format.

| | |
|---|---|
| [`bootstrap.spec.md`](./bootstrap.spec.md) | Identity, config, discovery — **read first** |
| [`signals.spec.md`](./signals.spec.md) | Event kinds, payloads, encryption, acknowledgement |
| [`watch-state.spec.md`](./watch-state.spec.md) | Board model, TTLs, overdue, handover |
| [`escalation.spec.md`](./escalation.spec.md) | The ladder as a state machine |

## Conventions

- **MUST / MUST NOT / SHOULD / MAY** carry RFC 2119 meaning
- All times UTC; all durations in seconds
- Constraint references like `[C24]` point at
  [`../research/constraints.md`](../research/constraints.md)
- Values marked *configurable* have a stated default and MUST be changeable without a
  code change

## The one architectural decision underneath all three

**Signals are encrypted to the Watchtower key, not to the individual holding watch.**

The alternative — encrypting to whoever currently holds the board — breaks on handover,
locks the agent out of anything addressed to a human, and makes shared watch [C28]
impossible.

The cost is explicit: **the box can read every signal.** That is already true, since it
holds the board, runs the agent, and executes escalation. It is stated here rather than
implied, and it is why the node inventory in
[`../principles.md`](../principles.md) says plainly what a seizure would yield.
