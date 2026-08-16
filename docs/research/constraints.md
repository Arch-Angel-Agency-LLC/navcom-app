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

**C13 — Endorsements carry scope tags, never free text.** An endorser explaining *why*
someone is credible is how that operator's history leaks. The person with the most
valuable knowledge often has the most to lose from it being described.

**C14 — A credential names only its signer.** *"I vouch for the holder"* — never the
recipient. Nobody can create a record naming a person who hasn't consented to exist in
the system.

**C15 — Presets set switches, never override them.** Bundled visibility decisions are how
operators get exposed without making a bad choice. No preset is visible to anyone else.

**C16 — Funding is independent of visibility, and totals are never shown.** The operator
who most needs donations may be the one who most needs to stay invisible. Visible totals
would rebuild the leaderboard we refused, with money as the score.

**C17 — Correction works offline and queues.** Discovery happens at the worst moment for
connectivity and the most urgent moment for action. A path that needs signal is a path
that goes unused.

**C18 — Design for the minority who maintain; free-riding stays costless.** Maintenance
comes from a small core with direct motivation plus crews where a lead assigns it. A
directory demanding reciprocity gets abandoned by the people it most needs.

**C19 — Team presence and network presence are separate features.** Team is useful at
three operators; network needs density that doesn't exist early. When live counts are
thin, aggregate over time — "0 operators active" is true and destructive.

**C20 — Endorsement provenance by name, never a count.** Trust follows recognising the
endorser. A number invites gaming; a name makes a generous endorser's volume
self-evidently weak signal.

**C21 — Seeded entries are visually distinct, not merely tagged.** Low-confidence data
that looks authoritative is more dangerous than no data.

**C22 — The recap never discloses team size or collective activity**, and carries no
impact claims. Understatement is both more shareable and more honest.

**C23 — The watch state is always visible before sign-on.** An operator believing a human
is watching when none is has been misled at the worst possible moment.

**C24 — `Distress` terminates in a human, or reports that it couldn't.** No triage, no
filtering, no agent assessment. Every escalation step is reported back to the operator.

**C25 — Agents are always identified as agents.** In the watch state, in every
acknowledgement, in the log. Never ambiguous, never impersonating.

**C26 — No cloud inference on operational data.** Signals, positions, queries and board
state are the network's complete operational picture. Local inference only.

**C27 — The board is Live, never stored.** Watch state hands over or expires. There is no
queryable history of who was out where.

**C28 — Watch is shareable.** Answering queries must be possible without holding the whole
board, so operators who can't commit a full shift can still contribute their knowledge.

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

- **Sybil resistance is weak, and stays weak by choice.** Keys are free to generate, and
  every technical countermeasure worth having would require identity or history — which
  excludes the operators with the most valuable knowledge. The answer is social:
  provenance over count (C20), and out-of-band verification where infiltration is the
  real threat. Revisit only if impersonation actually appears.
- **Cold start in a new city.** Mitigated by seeding, visual distinction (C21) and the
  onboarding verification task — but whether correction actually happens is still the
  thing to watch.
- **Presence density.** Addressed by splitting team from network presence and aggregating
  over time (C19). The threshold at which a live network count stops being depressing is
  untested.
- **Directory maintenance.** Still the single largest unproven assumption in the project.
  C17 and C18 improve the odds; they don't settle it. Rural regions are the hard case —
  worst public data and fewest operators to fix it.
- **Seeding quality varies by region.** Public data is good in some metros and nearly
  absent in others.
- **Whether the op recap is good enough to post.** Propagation depends on operators
  actually wanting to share it, which makes design quality the mechanism.
