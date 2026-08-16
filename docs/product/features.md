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
- Endorse people you've worked beside
- Your record: ops run, ground covered, contributions credited, time served

## Presence — the network is alive

The feature that makes the app worth opening when nothing is scheduled.

- **Who's out tonight** — your team, your city, or the wider network
- **Visibility levels:** off · team · city · network. Default is team.
- Coarse by default. Presence means "active," not "here is my position."
- Travelling? See who's active where you're going, before you arrive.

Deliberately excluded: activity leaderboards, streaks, "days since last op." Presence
reflects tonight only, and an operator who has been away for months returns to no
commentary whatsoever.

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

- One-tap flagging when something's wrong — always easier than fixing it
- Volatile data shows its age; stale data reads "call first"
- Corrections credited to the contributing callsign

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
marked, no call to action. Generated on request.

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
2. **Presence** — the network becomes visible. Requires relays.
3. **Ops** — sessions, team view, check-in, duress, logs.
4. **Knowledge** — directory and playbooks, with attribution.
5. **Standing** — endorsements, held and presented.

Identity first because it's what makes the app theirs, and because it's the substrate
everything else attaches to.
