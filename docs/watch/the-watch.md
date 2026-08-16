# The Watch

Someone is always on watch. That's the whole system; everything else attaches to it.

Not "notifications are enabled." A named party — human or agent — has accepted
responsibility for the operators who are out, for a defined shift. When you signal,
something answers.

---

## Roles

**On watch.** Holds the board. Sees who's out, where roughly, how long, when they last
made contact. Answers signals. Looks things up. Raises other operators when needed.
Works from the [Console](./console.md).

**In the field.** Signs on before going out, signals as needed, stands down at the end.
Works from the [Field Terminal](./field-terminal.md).

**On call.** Not at the console, but reachable — the escalation target when watch needs
a human.

An operator can hold more than one role over time. Someone who never patrols can be one
of the most important people in the network by taking watch, which is the point: this
gives support-class operators a real post rather than a spectator seat.

## Watch states

**An operator must know what is actually behind them before they go out.** The Field
Terminal displays the current state at all times, and states it plainly at sign-on.

| State | Meaning |
|---|---|
| **Station** | A named human is at the console, actively watching |
| **Automated + on-call** | [Agent](./agents.md) holds the board; a named human is reachable |
| **Automated** | Agent holds the board; no human has committed to on-call |
| **Dark** | No watch. Field Terminal runs standalone on cached data |

**Automated is a normal operating state, not a failure.** With a small roster it will be
the most common one. What is never acceptable is an operator believing a human is
watching when none is.

## The escalation guarantee

**A `Distress` signal must terminate in a human, or tell the operator it couldn't.**

This is the one rule automation does not get to relax. The agent's job in an emergency is
to raise someone, not to handle it.

**The ladder only works if someone can actually be woken.** A paging channel is therefore
a *condition of the on-call role* — being on-call means being reachable, and that's the
whole content of the commitment. An operator who won't register a channel isn't on-call,
which is a legitimate choice. See [`../product/opt-ins.md`](../product/opt-ins.md).

1. **Page every on-call operator** through the channel each of them registered. No triage,
   no filtering, no assessment
2. **No acknowledgement inside the window** → continue down the on-call roster
3. **Roster exhausted** → the operator's own emergency contact, if they set one.
   Device-initiated where the phone is responsive; from the box where the operator opted
   into storing the number
4. **Nothing left** → say so plainly: *"couldn't reach anyone."* Never silence
5. **Report every step to the operator as it happens** — "paging", "no answer, trying
   next", "couldn't reach anyone"

An operator in trouble who knows nobody is coming can act on that. One who believes help
is en route when it isn't isn't merely unhelped; they're misled at the worst possible
moment.

**An operator with no emergency contact and an empty roster still gets the truth.** The
ladder is allowed to fail. It is not allowed to fail quietly.

An operator in trouble who knows nobody is coming can act on that. One who believes help
is en route when it isn't isn't merely unhelped; they're misled at the worst possible
moment.

## Duty

**Taking watch.** Explicit and ceremonial. You go on station, the board is yours, and
everyone out can see your callsign. Signing on means something — that's not decoration,
it's what makes the responsibility real.

**Holding the board.** Watch the timers. Answer signals. Take `Query` requests so the
operator in the cold doesn't have to search a database one-handed. Notice when someone's
overdue.

**Handover.** Watch is handed to a named successor or explicitly dropped to Automated.
Never silently abandoned. The incoming watch inherits board state, open signals, and
anyone currently overdue.

**Standing down.** Confirm everyone out has stood down, or hand over with them still
active and flagged.

## Qualification

Not everyone should take watch. It requires someone who will stay awake, stay reachable,
and answer.

Qualification is an [endorsement scope](../product/identity.md) — `can take watch` —
granted by operators who have worked with you. It uses the standing model already in
place rather than introducing a rank.

There is no hierarchy here. Watch is a **post**, not a rank. Whoever holds it has the
board; when they stand down they don't outrank anyone.

## When nobody has watch

Dark is survivable and the Field Terminal must stay genuinely useful in it:

- Cached directory, fully available offline
- Field playbooks
- Duress falls back to SMS to the operator's own contact
- Everything logged locally, synced when a watch comes back up

**Design rule: the field never hard-depends on the watch.** The watch makes an operator
more effective; its absence must never make them less safe than having no app at all.
