# Research

Why NavCom is scoped the way it is. Read this before proposing a feature.

## ⚠️ Status of this research

**These archetypes are a design device, not empirical user research.** They were
constructed from published material about volunteer street outreach and the RLSH
community — not from interviews. They are useful for finding contradictions and failure
modes early, and they are *not* evidence about real people.

Real users enter at [Phase 0](../phase-0/README.md). Anything here that survives contact
with them is a finding; anything that doesn't was a hypothesis.

## Method

1. Build a roster of twelve archetypes chosen to cover the risk surface, not the
   average user — including the people most likely to refuse, break, or abandon the tool.
2. Run every candidate feature against all twelve. Pass / conditional / fail.
3. Run the surviving features backwards: what makes each archetype *uninstall*?
4. Keep only what survives both directions.

Choosing archetypes for coverage rather than typicality is the whole trick. A roster of
enthusiastic users would have validated everything.

## Documents

| | |
|---|---|
| [`archetypes.md`](./archetypes.md) | The twelve, and the stress each applies |
| [`feature-validation.md`](./feature-validation.md) | The pass/fail run, uninstall analysis, and surviving tiers |
| [`prior-art.md`](./prior-art.md) | What already exists, and what we deliberately are not rebuilding |

## Headline findings

**1. Everything requiring other people failed. Everything that works alone passed.**

Directory, reference, incident log, panic wipe — all single-player, all passed. Map,
presence, vouching, chat — all multiplayer, all failed. The user population is small,
distributed, pseudonymous, and asynchronous. Multiplayer features assume a density that
doesn't exist.

**2. The social graph isn't just weak — it's hazardous.**

Vouching plus presence plus a live map produces a queryable map of pseudonymous
activists' identities, locations, and associations. That is the single artifact most
damaging to this community if breached, subpoenaed, or leaked. It would have been our
highest engineering cost and our largest liability simultaneously.

It also fails in the worst possible direction: a trust graph built on digital history
ranks lived-experience contributors as *untrusted*, which is exactly backwards.

**3. Standard engagement mechanics are uninstall triggers here.**

Notifications, streaks, reminders, and "you haven't been active in 60 days" are all
deletion events for this population. Push notification infrastructure (FCM/APNS) also
leaks recipient metadata to Google and Apple, which fails the privacy-conscious users
outright.

**4. The retention target is inverted.**

Not engagement — *never giving anyone a reason to delete it*, so it's present the night
they need it. This is a first aid kit, not a social app.

**5. The project is ~20% code, ~80% content curation.**

The engineering is the easy part. All the value and all the risk live in whether the
directory is accurate and stays accurate. That is the question Phase 0 exists to answer.
