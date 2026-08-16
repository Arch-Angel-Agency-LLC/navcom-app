# Data Tiers

Four tiers with genuinely different rules. Getting these confused is how a tool becomes
either useless (nothing accumulates) or dangerous (everything is retained).

| Tier | Lifetime | Location | Panic wipe | Failure mode |
|---|---|---|---|---|
| **Accruing** | Permanent | Device + operator-held backup | Survives | Losing it |
| **Live** | Minutes to hours | Relay, ephemeral | N/A — already gone | Persisting it |
| **Wipeable** | Until wiped | Device only | **Destroyed** | Retaining it |
| **Collective** | Permanent | Shared, public-ish | Survives | Going stale |

---

## Accruing — the thing you build

Your persona, standing, endorsements, contribution credit, op history.

- Stored on device; exportable so a lost phone isn't a lost decade
- Endorsements are signed attestations **you hold and present** — no central graph
- Contribution credit is attached to a callsign, never to a person
- **Panic wipe does not touch this tier.** Losing a seized phone should not erase six
  years of standing. Recovery is via operator-held backup, not an account on a server.

Design test: *after a year of use, what does an operator have that they didn't before?*
If the answer is nothing, this tier is broken.

## Live — the thing happening now

Presence, active op state, positions during an op, check-in status, duress alerts.

- Ephemeral by construction — published to relays as non-stored events, not written to a
  database
- Opt-in per session; sharing starts when you clock into an op and stops when you clock
  out or the session expires
- Visibility levels: **off · team only · city · network** — set by the operator, defaults
  to team only
- Position resolution is coarsened by default; precise sharing is a deliberate act
- Nothing here is queryable after the fact. There is no position history to subpoena
  because there is no position history.

Design test: *if a relay operator kept everything they received, what would they learn?*
The answer must be "who was roughly active, roughly when" — and nothing more.

## Wipeable — the thing that must vanish

Incident logs documenting harassment aimed at *you*, local caches of op detail, drafts,
anything about tonight.

- Device only. Never synced, never backed up automatically
- Encrypted at rest
- **Panic wipe destroys this tier completely and unrecoverably** — real deletion, not a
  flag
- Exportable deliberately, by the operator, before it's needed

Design test: *if this phone is taken, what does it give up?* Ideally nothing beyond the
existence of the app.

## Collective — the thing everyone builds

Resource directory, field playbooks, local knowledge notes.

- Shared, replicated, cached offline in full
- Contributions attributed to callsigns — visible expertise without identity
- Carries verification metadata and staleness (see
  [`directory-schema.md`](./directory-schema.md))
- Assume it is readable by anyone. Never put operational or personal detail here.

Design test: *is this more accurate than it was last month, and can you tell who keeps
it that way?*

---

## Where features land

| Feature | Tier |
|---|---|
| Persona, callsign, emblem | Accruing |
| Endorsements, standing | Accruing |
| Op history, ground covered | Accruing |
| Contribution credit | Accruing |
| Who's out tonight | Live |
| Team positions during op | Live |
| Check-in status | Live |
| Duress alert | Live (delivery), Wipeable (local record) |
| Incident log | Wipeable |
| Cached op detail, drafts | Wipeable |
| Resource directory | Collective |
| Field playbooks | Collective |

## The rule that ties it together

**Panic wipe destroys the Wipeable tier and nothing else.**

An operator who wipes under duress loses tonight and keeps their decade. That balance is
the entire reason these tiers exist separately — and it's why a single blanket
retention rule, in either direction, is the wrong answer.
