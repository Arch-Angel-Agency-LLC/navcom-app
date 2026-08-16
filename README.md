# NavCom

**Offline-first field reference and safety kit for volunteer street outreach.**

> **Status: Phase 0 — validating the data. No application exists yet, deliberately.**
> See [`docs/phase-0/`](./docs/phase-0/README.md).

---

## The problem

The hardest practical problem in street outreach isn't coordination. It's matching the
person in front of you to the right resource, right now.

Which shelter has beds tonight. Which one takes dogs. Which takes couples. Which won't
turn someone away for using. What time intake *actually* closes, as opposed to what the
website says. Where the warming center moved to.

That information is critical, perishable, hyper-local — and wrong nearly everywhere
it's published. Official listings rot. Search results are fiction. The only people who
know the truth are the ones who were out there last night.

## What NavCom is

- **Resource directory** — what's open, and who they'll actually take
- **Field reference** — de-escalation, first aid, rights
- **Incident log** — private, local, for documenting harassment directed at you
- **Panic wipe**
- **Duress alert** with SMS fallback

Offline by default. No accounts. No profiles. No server that knows anything about
anyone.

## What NavCom is not

Cut deliberately, after running twelve user archetypes against every candidate feature.
Each of these failed on the people it most needed to serve:

`live position maps` · `vouching / trust graphs` · `presence indicators` ·
`team chat` · `op scheduling` · `inventory` · `push notifications`

The reasoning is documented. If one of these returns, it will be because a real user hit
real friction — never because it sounded good.

## Design principles

**It's a first aid kit, not a social app.**
Nobody opens a first aid kit weekly, and nobody throws one away. The goal is never to
give someone a reason to delete it, so that it's there the night they need it. No
notifications, no streaks, no reminders, no nags, no engagement loop.

**An honest blank beats a confident guess.**
The worst thing this tool can do is give a confident wrong answer that sends someone
somewhere that turns them away at 10pm. Volatile data always displays its age.
"Call first" is a first-class answer. Reporting that something is wrong is always
easier than fixing it.

**No data about the people being served. Ever.**
This directory describes services, never recipients. There is no field for it, and
there never will be.

**Pseudonymity is the security product.**
The realistic threat here is doxxing, stalking, and harassment. So: no real names, no
phone numbers, no email, no recoverable social graph, no central database worth
breaching or subpoenaing.

**The device floor is a prepaid Android 8 with 400MB free.**
Not a developer's phone. If it doesn't run there, it doesn't ship.

## Roadmap

| Phase | | |
|---|---|---|
| **0** | Prove the data — no code | ← we are here |
| 1 | Thinnest possible wrapper (PWA, no backend) | |
| 2 | Safety kit — reference, incident log, wipe, duress | |
| 3 | Reassess from observed use, not speculation | |

## About the name

**NavCom is short for navigation, not communications** — and it did not start that way.

The project was originally scoped as decentralized off-grid field operations
*communications*: an ATAK-class tactical platform, mesh transports, a CoT bridge. The
archetype run killed all of it. Every communications feature was cut, and the surviving
tier is a field reference and a personal safety kit with no interpersonal messaging in
it at all.

So the name kept, with the meaning it earned: **navigating a person to the right
resource.** That is the whole product. Anything you find describing NavCom as a comms
platform predates the pivot and is wrong — see
[`prior-art.md`](./docs/research/prior-art.md) for what was explored and why it was
shelved.

The repository is still `navcom-app` for URL stability. There is no app yet, and there
won't be until Phase 0 says there should be.

## Repository

```
docs/phase-0/README.md            The Phase 0 protocol, and go/kill criteria
docs/phase-0/directory-schema.md  Field schema, intake taxonomy, staleness model
data/phase-0/resources.seed.csv   Importable column headers + example rows
docs/research/README.md           Why the scope is what it is — read before proposing
docs/research/archetypes.md       The twelve, and the stress each applies
docs/research/feature-validation.md  The pass/fail run and surviving tiers
docs/research/prior-art.md        What exists, what was shelved, and why
```

## Contributing

Right now the useful contribution is **data, not code** — and local knowledge most of
all. If you do outreach and you know which listings are wrong, that's the thing this
project needs.

Please don't open scaffolding PRs. Phase 0 exists to find out whether the directory can
be kept accurate. If it can't, no amount of engineering fixes that, and the honest
outcome is to stop.

---

A project of [Archangel Agency](https://archangel.agency).
