# Operating Brief

NavCom is **the Watchtower**: someone is always on watch while operators are out. Two
applications joined by a duty relationship — a Console for whoever holds watch, a Field
Terminal for whoever's on the street.

This is not a social app, a tactical map, or a humanitarian directory, and each of those
is a failure mode it has already been rescued from. Read
[`docs/research/lore.md`](docs/research/lore.md) before proposing anything.

---

## Current scope

**Build only this:**

> One operator signs on from a phone. The agent sees them on the board. The operator
> sends `Query`. An answer comes back.

That loop proves the entire product. Everything else — endorsements, presets, funding,
propagation, recovery, a second Watchtower — is **out of scope until it works**.

Specs exist only for the MVP surface. If you find yourself needing a spec that isn't in
[`docs/spec/`](docs/spec/), you are building something out of scope.

## Build

**Node first.** Development happens on the Jetson Orin AGX (custom Linux), which runs the
whole server side: RelayNode, Mecha Jono, directory host, watch state machine. That's the
half holding safety, and it's the local available work — prove the loop against the node
with a crude client (a script, `curl`) before writing a line of UI.

Order: **node + agent → field terminal → console.**

| | Decision | Status |
|---|---|---|
| Field Terminal | PWA. No app store, cross-platform from one codebase, instant updates, no FCM in the loop, and it fits the device floor | Decided |
| UI framework | Svelte — existing team competence, small bundles | Decided |
| Console | Web app, same delivery. Desktop-shaped, not a large terminal | Decided |
| Node services | Language open; pick what integrates with Mecha Jono most directly | **Open** |
| Relay topology | Public relays (zero ops, works now) vs. self-hosted RelayNode (metadata control) | **Open** |
| Accountability log storage | Append-only, node-local, 90 days | Implementation detail |

**Escalation executor is a separate process from the agent.** Non-negotiable — see
[`docs/watch/agents.md`](docs/watch/agents.md). A compromised agent must not be able to
impair escalation.

### Two roles the design requires a human for

- **On-call** — reachable when the board can't raise anyone. Lighter than watch: a phone
  that might ring, not a shift. Currently concentrated in one person, which is a known
  risk
- **Log reviewer** — reads drill results and agent logs on a cadence. Minutes per week,
  but it cannot be the agent, or verification is theatre

### Not agent work

Directory seed data and field playbooks need humans with local knowledge and real
de-escalation expertise. **Do not generate playbook content.** The Medic archetype's kill
trigger is confident wrong guidance, and plausible-sounding safety content is worse than
none.

## Invariants

Never violated, no exceptions, no configuration:

1. **Nothing is recorded about the people being served.** No field, no convention. This
   is a rule about what the system *offers*; free-text notes can't be enforced, so guide
   rather than pretend.
2. **`Distress` terminates in a human, or tells the operator it couldn't.** The ladder may
   fail. It may never fail silently.
3. **Duress is always deliberate.** Never inferred from silence, missed windows, or
   inactivity.
4. **The watch state is visible before sign-on.** An operator must never believe a human
   is watching when none is.
5. **Agents are always identified as agents**, and never the sole responder to `Distress`.
6. **Panic wipe destroys the Wipeable tier and nothing else.** Burn destroys everything.
7. **No legal names anywhere.** Contact details only where an operator opted in for
   themselves.
8. **Volatile data shows its age.** Stale reads "call first"; blank reads "unknown."

## Anti-patterns — you will want to do these

Every one is a conventional solution that is wrong here. If a change feels like an
obvious improvement in this direction, it's the market reasserting itself.

| You'll want to | Don't, because |
|---|---|
| Add a feed or activity stream | Operational tools open into a situation, not a timeline. Principle 2 |
| Add notifications | Only `Distress` paging, only to on-call operators who registered a channel. The field terminal is silent |
| Persist the board for history | The board expires. Only the accountability log survives, and it records actions, not positions |
| Let the agent judge or decide | Its authority is bounded so misbehaviour is survivable. Unverifiability is answered by limits, not by better tests |
| Put a search box on the field terminal | `Query` goes to the watch. Someone with a console and both hands free does the lookup. That *is* the product |
| Make onboarding engaging | No streaks, badges, prompts, or nudges. Ever |
| Escalate on a missed check-in | Overdue nudges. Alarm fatigue destroys the one mechanism where failure means someone is hurt |
| Add comments or replies | Answers become directory or playbook entries. Knowledge, not discussion |
| Show endorsement counts | Provenance by name. A number invites gaming |
| Show funding totals | Money is a stronger status signal than any badge |
| Build a nice map view | Device floor is a prepaid Android 8 with 400MB free |

## Where things live

| | |
|---|---|
| `docs/spec/` | **Normative.** Event kinds, state machines, windows. Build from these |
| `docs/watch/` | The watch model, narrative |
| `docs/product/` | Identity, data tiers, visibility, directory, funding |
| `docs/research/` | Why the design is shaped this way. `lore.md` first |
| `docs/principles.md` | Design rules and conflict resolution order |
| `docs/research/constraints.md` | Index of all binding constraints |

Where narrative and spec disagree, **the spec wins** — and the narrative is a bug to fix.

## Verifying work

- Invariants above are written as assertions on purpose. They should have tests.
- Escalation is safety-critical: test the failure paths, not just the happy path.
- The device floor is a real target, not an aspiration. Check bundle size.
- If you added a rule, add it to `constraints.md`. If you broke one, say so explicitly.

## Two known-hard tensions

Both produced real bugs already. When a rule is stated absolutely, ask **what does this
make impossible?**

- Panic wipe vs. endorsements as association data → resolved by burn/wipe split
- "No push" vs. an escalation ladder that must wake someone → resolved by separating
  engagement notifications from safety paging
