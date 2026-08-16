# Constraints

What the [archetype](./archetypes.md) stress tests demand of any design. These are
requirements to build against — not a scope boundary.

---

## Hard constraints

Non-negotiable. A design that violates one of these is wrong regardless of its merits.

| | Constraint | Source |
|---|---|---|
| **H1** | No data about the people being served — no field, no convention, no exception | Medic, ethics |
| **H2** | Panic wipe destroys the wipeable tier completely; identity survives | Protest Medic |
| **H3** | No legal names, phone numbers or email addresses anywhere in the system | Skeptic, Convert |
| **H4** | Duress is always deliberate, never inferred from silence | Heart |
| **H5** | Volatile data displays its age; stale reads "call first" | Medic |
| **H6** | Runs on a prepaid Android 8 with ~400MB free | Convert |
| **H7** | Knowledge layer fully usable offline | Outpost |
| **H8** | Every network call auditable; no third-party analytics or push | Skeptic |

## Design constraints

Strong defaults. Departing from one requires a documented reason.

**C1 — Every social feature has an off switch, and the app works with all of them off.**
The Ghost is a full user. Visibility defaults to private; ceilings stay high.

**C2 — Standing accrues on two independent axes.** Contribution requires nobody's
permission, so an operator with deep knowledge and no social history builds real standing
alone. Single-axis reputation ranks the Convert as untrusted, which is backwards.

**C3 — No central social graph.** Endorsements are signed attestations held by the
recipient and presented on demand. The graph would be the most dangerous artifact this
project could create.

**C4 — Missed check-in nudges; it never escalates.** Alarm fatigue kills the one feature
where failure means someone is hurt.

**C5 — No streaks, badges, leaderboards or absence commentary.** Competitive mechanics
attract the personality this community is wary of, and guilt is a deletion trigger.

**C6 — Give the Public Face something designed to leave the app.** A safe, shareable
artifact of his own work. Absent one, he'll screenshot something with a teammate's
callsign in it.

**C7 — Presence must show the wider network, not just the local one.** For an isolated
operator an empty local map reads as "you are alone." The country is the point.

**C8 — Flagging is always easier than fixing.** Most people will only ever have the
first half of the correction.

**C9 — Export everything.** Op logs to Herocore, identity and endorsements to an
operator-held backup. Nothing holds an operator captive.

**C10 — Offline is a normal state, not an error.** Degrade visibly; never fail silently.

**C11 — Growth follows existing trust paths.** No referral rewards, invite quotas,
contact list upload, or proximity pressure. Density is a precondition for most features
working, so propagation is a correctness concern — but reward-driven recruiting would
attract the personality this community is wariest of.

**C12 — No city starts empty.** A new metro seeds from public sources at low confidence.
The first operator somewhere must find a thin and obviously-imperfect starting point,
never a blank screen.

---

## Known conflicts and their resolutions

**Team oversight vs. operator autonomy** (Team Lead vs. Ghost, Skeptic)
→ Visibility is granted by the operator, never claimed by the lead. Team views show who
opted in. A lead sees what his crew chose to show him.

**Durable records vs. seizure risk** (record-keeping vs. Protest Medic)
→ Split by tier. Identity and standing persist; positions and incident logs are wipeable
and never synced. There is no position history to subpoena because none is retained.

**Publicity vs. pseudonymity** (Public Face vs. everyone)
→ Solved by provision, not restriction. Give him a scrubbed, shareable artifact.

**Accuracy vs. coverage** (Medic vs. cold start)
→ Accuracy wins. An honest "unknown" is always preferable to a confident wrong answer.
Thin and correct beats comprehensive and rotting.

---

## Open questions

Unresolved, and worth flagging as such:

- **Sybil resistance is weak.** Keys are free to generate. Endorsement value rests on
  recognising endorsers, which doesn't scale to strangers. Acceptable for now;
  revisit if impersonation appears.
- **Cold start in a new city.** A directory with nothing local is worth little. Seeding
  from public sources plus community correction is the plan; whether correction actually
  happens is the thing to watch.
- **Presence density.** Presence is compelling with fifty operators and depressing with
  three. Network-wide visibility (C7) is the mitigation, but the threshold is untested.
- **Directory maintenance.** Whether operators will keep listings current over time is
  the single largest unproven assumption in the project.
- **Unclaimed endorsements.** Reaching someone outside the app with "you've been vouched
  for" could read as recognition or as being volunteered for something. Needs a real
  answer from operators before it ships.
- **Seeding quality varies by region.** Public data is good in some metros and nearly
  absent in others.
