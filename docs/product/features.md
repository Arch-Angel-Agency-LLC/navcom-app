# Features

Organised around the operational loop: **arrive → see → work → learn → keep.**

Every feature here has a visibility setting or an off switch. Operators who share
nothing still get a working app; operators who share everything get a better one.

---

## Identity — the anchor

Persona, standing, endorsements, personal record. Full detail in
[`identity.md`](./identity.md).

- Create a persona in under a minute; no account, no email, no phone number
- Present endorsements to operators you've just met, verifiable offline
- Endorse people you've worked beside — scope tags, never free text
- Your record: ops run, ground covered, contributions credited, time served

## Visibility — Ghost, Team, Open

One choice at onboarding sets the individual switches; every switch stays adjustable
afterwards and no preset is ever visible to anyone else. **Ghost is a complete
configuration** — knowledge, safety kit, personal record, standing, nothing shared.
Detail in [`visibility.md`](./visibility.md).

## Support — receive without being identified

An optional Lightning address on your card and op recaps. Pseudonymous receipt, which
no conventional donation platform can offer someone working under a persona.

The app never touches funds and never shows totals to anyone. Independent of visibility
— available in Ghost. Detail in [`funding.md`](./funding.md).

## Presence — the network is alive

The feature that makes the app worth opening when nothing is scheduled.

**Team presence and network presence are different features with different thresholds.**
Team presence is valuable at three operators and ships first. Network presence needs
density that doesn't exist early on.

- **Who's out tonight** — your team, your city, or the wider network
- **Visibility levels:** off · team · city · network. Default is team.
- Coarse by default. Presence means "active," not "here is my position."
- Travelling? See who's active where you're going, before you arrive.

**When live counts are thin, aggregate over time instead.** "47 operators across 12
cities this month" is honest and encouraging. "0 operators active" is equally true and
actively damages the product. Show the live network count only above a threshold; below
it, show the month.

Deliberately excluded: activity leaderboards, streaks, "days since last op." Presence
reflects tonight only, and an operator who has been away for months returns to no
commentary whatsoever — in a small network, absence is conspicuous, which makes this
matter more rather than less.

## Ops — the work

**Start or join.** Type (patrol, outreach, event, response), area, expected duration.
Open to team, city, or invite.

**Live team view.** Positions of operators who chose to share, this session only.
Off by default; enabled per-op, never persistent. Ends automatically at clock-out.

**Check-in.** Optional interval. A missed check-in **nudges the team** — it never
declares an emergency. False alarms are the fastest way to make everyone ignore real
ones, so silence is never treated as distress.

**Duress.** A deliberate action, never inferred. Alerts the team with last known
position; falls back to SMS where there's no data. Works with a locked screen.

**Field notes.** Text, photo, timestamp, coarse location — added as you go, about
*situations and services*, never about people.

**Clock out.** The log is already written.

## Knowledge — the leverage

**Resource directory.** What's open, and who they'll actually take: pets, sobriety, ID
requirements, curfew, intake windows, capacity signals. Cached in full for offline use.
Schema in [`directory-schema.md`](./directory-schema.md).

- **One-tap flagging, offline, queued for sync.** The moment an operator discovers a
  listing is wrong is the moment of worst connectivity and highest urgency — standing
  outside a closed shelter at 10pm with someone who needs a bed. If correcting requires
  signal or a form, it never happens
- Volatile data shows its age; stale data reads "call first"
- Seeded entries look visibly different from operator-verified ones
- Corrections credited to the contributing callsign

**Verify five listings.** Offered once during onboarding, never a gate and never
repeated. Teaches the app, contributes real local data, and turns an empty new city into
someone's first contribution.

**Field playbooks.** De-escalation, first aid, rights, cold-weather guidance,
overdose response. Versioned, offline, authored by operators who actually train people.

**Ask the network.** A question reaches operators with relevant local knowledge.
Answers become directory entries or playbook additions rather than evaporating in a
chat scroll.

**Supply signals.** Surplus and shortage across a team — who has socks, who needs water
— without a group chat thread.

## Safety — the floor

**Incident log.** Private, local, encrypted. For documenting harassment aimed at *you*:
stalking, doxxing, hostile encounters. Never synced. Exportable deliberately.

**Panic wipe.** Destroys tonight's data completely and unrecoverably. Leaves identity
and standing intact.

**Burn.** Separate, deliberate, harder to reach, irreversible: destroys the persona too.

**Discreet presentation.** Configurable app name and icon, so a glance at a seized or
borrowed phone doesn't announce affiliation.

## Reach — how it travels

Detail in [`propagation.md`](./propagation.md).

**Endorse someone who isn't here.** Produces a claimable credential you pass along
yourself. Grows the network along real working relationships instead of recruitment.

**Op recap.** A scrubbed, well-made artifact of your *own* op, built to be posted
publicly — teammates' callsigns and positions stripped, location coarse, provenance
marked, no call to action, no disclosure that anyone else was there. Understated by
design: time, place, activity, what was done. No impact claims. Generated on request.

**Join by QR, in person.** Scan to join a team or an op. Unspammable by construction.

**Public directory.** Resource data readable on the open web without installing
anything. Useful to outreach workers who will never be operators.

Never built: referral rewards, invite quotas, contact list upload, "operators near you"
pressure, or standing that depends on how many people you recruited.

## Export — no captivity

- Op logs export in a form Herocore can take
- Identity and endorsements export as an encrypted operator-held backup
- Directory data is open

Nothing here holds an operator hostage. The app has to earn its place every night.

---

## Build order

1. **Identity** — persona, keys, record. Useful alone.
2. **Team presence** — valuable at three operators. Requires relays.
3. **Ops** — sessions, team view, check-in, duress, logs.
4. **Knowledge** — directory and playbooks, with attribution.
5. **Standing** — endorsements, held and presented.
6. **Network presence** — once density justifies it; aggregate view until then.

Identity first because it's what makes the app theirs, and because it's the substrate
everything else attaches to. Network presence last because it's the one feature that
gets *worse* the earlier it ships.
