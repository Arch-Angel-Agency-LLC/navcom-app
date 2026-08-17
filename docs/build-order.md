# Build Order

What comes after what, and what must be true first. **Sequence, not permission** — the
scope rule in [`../CLAUDE.md`](../CLAUDE.md) still holds, and nothing below is licence to
start something early.

This page exists so the trajectory survives between sessions instead of being re-derived
or quietly redirected.

---

## The gate model

Two tracks run in parallel, and only one of them is gated.

```
  THE BOX                                    NAVCOM.APP
  ───────                                    ──────────
  Session 1: watch state machine             Static site
  + CLI client, 7 checks                     directory · docs · status
         │                                          │
         │ gate: all 7 pass                         │ ungated — no protocol,
         ▼                                          │ no keys, no relay,
  Shared core extracted                             │ no daemon
         │                                          │
         ▼                                          │
  Field Terminal  ◄─────────── served from ─────────┘
         │
         ▼
  Console (served from the box, not the web)
         │
         ▼
  Escalation ladder — 7 failure tests written first
```

## Now

**On the box.** Session 1: a daemon holding a board in memory, a CLI client, seven checks
against a public relay. Definition of done in [`../CLAUDE.md`](../CLAUDE.md).

**Here.** The `navcom.app` static site. It has **no dependency on the loop** — no protocol,
no keys, no relay, no daemon — which is what makes it the correct parallel work rather
than a distraction from the build order.

| | Step | Notes |
|---|---|---|
| A1 | Scaffold | SvelteKit, static adapter, in `web/`. Budgets per [`delivery.md`](delivery.md) |
| A2 | Directory core | Schema types, CSV→JSON at build, per-field-group staleness, derived confidence. Pure logic, unit tested |
| A3 | Directory UI | All six display rules literally. Rule 4 is a stated gap |
| A4 | Docs surface | Renders the repo markdown |
| A5 | Status page | Reads *"escalation not yet built — no drills run"* until it isn't. Omits holder callsign |
| A6 | Deploy | Static host |

A1 and A2 depend on no outstanding decision and can start immediately.

## Gated on session 1 passing

**Extract the shared core** — signal, crypto and board logic as one library. Before the
first client, not after the second.

**Field Terminal**, and only the Status screen first: watch state, including Dark. That is
DoD check 6, the first screen in [`watch/field-terminal.md`](watch/field-terminal.md), and
the only screen that must work when everything else is down.

Remaining screens once the protocol has stopped moving. UI built against an unproven
payload gets rewritten when the payload changes, which is the whole reason for the gate.

## Gated on the Field Terminal

**Console.** Served from the box over LAN or localhost — see [`delivery.md`](delivery.md)
for why it cannot be served from navcom.app.

## Gated, and treated differently

**The escalation ladder.** It does not get the move-fast treatment the loop gets. The seven
failure-mode tests in [`spec/escalation.spec.md`](spec/escalation.spec.md) are written
*before* it ships, not after.

**Mecha Jono holding the board** is session 2, and it is one function call. Everything in
[`watch/agents.md`](watch/agents.md) is about what happens *around* that call.

**Native Android/iOS** is Mk1, for the two capabilities a PWA cannot provide. Decided,
deferred.

## Not started, and not to be started

Endorsements, presets, funding, propagation mechanics, recovery, allied interop, a second
Watchtower, RelayNode, Mission Package ingestion.

Each is designed. None is scope. A spec written before the loop is proven is a guess in a
more confident format — [`spec/README.md`](spec/README.md) says so about itself.

## Open decisions

| | Blocks |
|---|---|
| Which metro seeds the directory first | A3 onward, not A1–A2 |
| Whether `navcom.app` currently serves anything | A6 |
| Node service language for the box | Session 1 — TypeScript unless there's a reason |

## The seeding rule

Recorded here because it is the easiest way to do real harm quickly, and it governs A2–A3.

**Seed structural facts. Never seed intake rules.**

Name, address, type, phone and published hours are public and checkable, and
[`product/propagation.md`](product/propagation.md) explicitly endorses seeding them from
public sources at `method: website`, low confidence, visually distinct [C21].

`sobriety`, `pets`, `id_required`, `referral_required`, `sex_offender_ok`, `curfew` and
`belongings` are the fields the directory exists for, and they are absent from public
listings precisely because nobody maintains them. **They start `unknown` and stay `unknown`
until a human with local knowledge verifies them.** A plausible guess in those fields is
the Medic's kill trigger and the fastest way to end the project.
