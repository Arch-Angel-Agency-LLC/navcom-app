# The Ecosystem

NavCom is one of two applications. This document defines the other, what passes between
them, and — more carefully — what must not.

Lineage and inspiration are in [`lineage.md`](lineage.md). This page is about interfaces.

---

## Two altitudes of the same idea

Both applications serve **the operator who isn't in the field** — the guy in the chair.
That archetype is NavCom's central innovation at local scale and Starcom's entire premise
at global scale. They are the same post at two altitudes.

| | **Starcom** | **NavCom** |
|---|---|---|
| Altitude | Global, transnational | Local, one city, one night |
| Answers | *What is happening on Earth* | *Who has my back tonight* |
| Time horizon | Campaigns, patterns, networks | Minutes to hours |
| Failure mode | Being wrong about the world | Someone alone when they needed not to be |
| Scales by | Adding analysts | Adding someone awake |
| Artifact | Intel Reports → Mission Packages | A held board, and an answered signal |
| In one word | Knowing | Being with |

**You navigate by the stars.** Starcom is the fixed reference frame; NavCom is crossing
actual terrain using it. See [`positioning.md`](positioning.md).

## Starcom

A 3D global cyber command interface for cyber investigations and strategic intelligence
operations. Decentralised, open source. It refines raw intel into **Intel Reports**, and
Intel Reports into **Mission Packages** — the object it can hand to teams operating in
NavCom.

Its operators appear in NavCom's roster as
[the Investigator and the Cartographer](research/ecosystem-roster.md) — Ring 3, the
analysts. That ring already exists in the research; this document supplies the interface
it was missing.

## The Earth Intelligence Network

The network the two applications make possible: open-source intelligence, held by the
people who collected it, shared deliberately rather than centrally.

The operative idea inherited from Steele is **the eight tribes** — that intelligence fails
from structural non-sharing between groups that each hold a real piece, not from
insufficient collection. NavCom's contribution is **the ninth tribe: people with local
ground truth and no institution.** An operator who was on that block last night knows
things no agency, NGO or newsroom holds, because none of them were there.

Starcom refines what is publicly knowable. NavCom holds what is only knowable by being
present. Neither substitutes for the other, and the EIN is the name for both existing.

---

## The handoffs

Exactly two objects cross the boundary, in opposite directions, under different rules.

```
                 ┌──────────────────────────────────────┐
                 │            STARCOM                   │
                 │  raw intel → Intel Report → Mission  │
                 │              Package                 │
                 └───────┬──────────────────────▲───────┘
                         │                      │
          Mission Package│                      │ patterns, aggregated
             (inbound)   │                      │   and de-identified
                         │                      │      (outbound)
                 ┌───────▼──────────────────────┴───────┐
                 │            NAVCOM                    │
                 │   Console (watch)  ·  Field Terminal │
                 └──────────────────────────────────────┘
```

### Outbound — field to analysts

**Already specified.** [C35](research/constraints.md): field data crosses as **patterns,
never as operator records** — aggregated and de-identified, contribution deliberate and
per-item, never a sync.

The Cartographer's requirement stands: an operator may contribute a single incident to a
case without surrendering their [incident log](product/data-tiers.md), which stays
Wipeable-tier and device-local.

### Inbound — Mission Packages

**New, and the harder direction.** A Mission Package is the first object in the system's
history that arrives from outside and asks operators to act on it. Three existing rules
constrain it before its contents are even known.

**1. It must not become a feed.** [Principle 2](principles.md) — no feed, no browsing, no
comments, anywhere — is described in the principles themselves as doing more anti-drift
work than every other rule combined. An inbox of packages to scroll is a feed with a
military haircut. If Mission Packages arrive as a list that accumulates, the strongest
rule in the system is the first casualty.

**2. It is the most likely vector to break invariant 1.** Intelligence refined from OSINT
is very likely to contain information about individuals. NavCom's hardest rule is that
nothing is recorded about the people being served — no field, no convention, no exception.
An intel product crossing that line would not look like a violation at the time, which is
exactly what makes it dangerous.

**3. It has no home on the Field Terminal.** Five screens, one hand, dark, cold. Adding a
sixth for intel review contradicts the instrument's entire design.

### Where a Mission Package lands

**The Console, and only the Console. It reaches the field as a `Query` answer or an
`Assist`, or it doesn't reach the field.**

This needs no new primitive. The watch is *already* the human filter between a large
knowledge layer and an operator standing in the cold — that is what
[`Query`](watch/signals.md) is. A Mission Package is another thing the watch knows, and
the existing protocol is how what the watch knows reaches the field.

Consequences that follow directly:

- No Mission Package UI on the Field Terminal. Ever
- No notification to any operator about a package. The
  [field terminal is silent](watch/field-terminal.md), and only `Distress` escalation may
  page anyone
- A package is Live-tier or Collective-tier, never a fourth thing. If it is operationally
  current it expires with the board; if it is durable knowledge it becomes
  [directory or playbook entries](product/directory-schema.md) — knowledge, not discussion
- The watch holder is accountable for what they pass on, and passing it on is a logged
  action like any other

### The valve, stated as rules

| Direction | May cross | Must never cross |
|---|---|---|
| **NavCom → Starcom** | Aggregated patterns, de-identified; single incidents contributed deliberately | Operator records, callsigns, positions, board state, query text, endorsements |
| **Starcom → NavCom** | Situational context for the watch; durable knowledge that can become a directory or playbook entry | Anything identifying a person being served. Anything that arrives as a feed. Anything reaching the Field Terminal directly |

**The rule underneath both:** NavCom describes services and operators, never recipients —
and that survives contact with an intelligence platform or it was never a rule.

---

## What NavCom must never inherit from Starcom

The two applications have genuinely opposed instincts, and the boundary exists because of
that rather than in spite of it.

- **Global scope meeting a local privacy rule.** Starcom's job is to know things about the
  world. NavCom's job includes *not* knowing things about people. Scope does not transfer
- **Clearance and compartmentation.** [lore.md](research/lore.md) already refused these
  from the fiction. An intelligence platform is exactly where they would re-enter, and
  [watch is a post, not a rank](principles.md)
- **The analyst's confidence register.** An Intel Report is written to be acted on. A
  NavCom answer at 10pm must show its age and say "call first" when it doesn't know.
  [Principle 9](principles.md) binds hardest at this boundary
- **Cloud anything.** [C26](research/constraints.md) — no cloud inference on operational
  data. A Starcom integration must not become the route by which board state leaves the
  box

---

## Open questions

- **What a Mission Package actually contains.** This determines whether the inbound valve
  is a small spec or the hardest thing in the system. Everything above constrains the
  *shape* without knowing the payload, deliberately — the constraints hold regardless
- **Whether packages are addressed or broadcast.** Addressed to a Watchtower is compatible
  with everything here; broadcast to operators is not
- **Whether Starcom needs to read anything live from NavCom.** Currently assumed no. If
  that changes, it is a new valve and not an extension of the outbound one
- **Whether the two projects share identity.** An operator's keypair is device-local by
  construction; whether a Starcom analyst and a NavCom operator can be the same persona is
  unresolved and has real privacy consequences in both directions
