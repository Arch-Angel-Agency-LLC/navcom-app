# NavCom

**Field operations app for real-life superheroes and volunteer street outreach.**

Your callsign. Your team. Who's out tonight. What's actually open. What happened, and
what you learned — kept, so the next person doesn't learn it the hard way.

---

## What it does

**Identity.** A persona that's yours — callsign, emblem, city, the date you started.
Keys live on your device. Your legal name never enters the system, because there's no
field for it.

**Presence.** See that the network is alive. Who's out tonight, in your city and across
the country. Visibility is yours to set, down to invisible.

**Ops.** Start or join an op. Live team view, opt-in per session. Check in. Call for
help. When you clock out, the log is already written.

**Knowledge.** The directory of what's actually open and who they'll take — pets,
sobriety, ID, curfew, intake times. Field playbooks. What you learn at 2am becomes
everyone's capability by morning.

**Record.** Ops run, ground covered, knowledge contributed, endorsements from people
you've worked beside. Years of showing up, and something to show for it.

**Safety.** Duress alert with SMS fallback. Private incident log for documenting
harassment aimed at you. Panic wipe that actually wipes.

## What it never does

- **Records anything about the people being served.** No names, no descriptions, no
  photographs, no medical details. This app describes services and operators, never
  recipients. There is no field for it and there never will be.
- **Nags.** No streaks, no guilt, no "you haven't been active in 60 days," no push
  notifications routed through Google or Apple.
- **Asks who you really are.** Ever.

## Principles

**Opt-in, not absent.** Some operators share position; some never will. Both get a full
app. Features have visibility settings instead of being cut.

**Two kinds of memory, opposite rules.** Your identity, standing and contributions
accrue and are meant to last. Positions, incident logs and anything about tonight are
wipeable on command. Confusing these is how tools become either useless or dangerous.

**Honest retention.** The app earns opens by reflecting something real — the network is
active, your team is out, someone answered your question. Never by manufacturing
urgency.

**An honest blank beats a confident guess.** A wrong answer that sends someone somewhere
that turns them away at 10pm is the worst thing this app can do. Volatile data always
shows its age. "Call first" is a first-class answer.

**Pseudonymity is the security product.** The realistic threat is doxxing, stalking and
harassment — so: no real names, no phone numbers, no email, no central social graph, no
database worth seizing.

**The device floor is a prepaid Android 8 with 400MB free.** Not a developer's phone.

## Where it's going

Read [`docs/vision.md`](./docs/vision.md) for the destination this is built toward.

## Status

Early. Identity and presence first, then ops, then the knowledge layer. The resource
directory is being validated with live data in parallel — see
[`docs/product/directory-schema.md`](./docs/product/directory-schema.md).

## Repository

```
docs/vision.md                      Where this is going and what it becomes
docs/principles.md                  Design rules, and how conflicts get resolved
docs/product/features.md            The feature set and the operational loop
docs/product/data-tiers.md          The four tiers and their opposing rules
docs/product/identity.md            Persona, standing, endorsements-as-credentials
docs/product/directory-schema.md    Resource schema, intake taxonomy, staleness model
docs/research/archetypes.md         Twelve operator archetypes used to stress designs
docs/research/constraints.md        What the stress tests demand of any design
docs/research/prior-art.md          What exists, and what it teaches us
data/resources.seed.csv             Importable directory columns
```

## Contributing

Most valuable contribution right now is **local knowledge** — if you do outreach and you
know which listings are wrong, that's the thing this project needs most.

---

A project of [Archangel Agency](https://archangel.agency).
