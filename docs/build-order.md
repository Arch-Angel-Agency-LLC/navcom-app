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

**On the box.** Session 1 is **done — all seven definition-of-done checks pass** (confirmed
2026-08-18). The gate below is open.

**Here.** The `navcom.app` static site. It has **no dependency on the loop** — no protocol,
no keys, no relay, no daemon — which is what makes it the correct parallel work rather
than a distraction from the build order.

| | Step | Status |
|---|---|---|
| A1 | Scaffold — SvelteKit, static adapter, in `web/` | **done** |
| A2 | Directory core — staleness, confidence, parsing. Pure logic, 30 tests | **done** |
| A3 | Directory UI — all six display rules. Rule 4 is a stated gap | **done** |
| A4 | Docs surface — renders the repo markdown at build time | **done** |
| A5 | Status page — says *"escalation not built, no drills run"* until it isn't | **done** |
| A6 | Deploy — Vercel, static, at `navcom.app` | **done** |

`npm run verify` in `web/` runs type-check, data check, build, tests and budget together.
`npm run check:data` alone answers "is my CSV edit valid" in about a second.

**Measured:** 37 pages, worst page 8.0 kB gzipped, **zero JavaScript delivered** — every
page works with scripting disabled. Budget is enforced by `web/scripts/budget.mjs`, which
measures what a browser downloads for a page rather than what sits in `build/`; those
differ sharply here, because the client build still emits chunks no page ever loads.

**Verified, not assumed.** `npm run verify` runs type-check, build, 45 tests and the
budget. The display rules have regression tests asserted against the **built HTML**, not
only against the logic — a component edited to "simplify" the stale case would otherwise
pass every unit test while shipping the failure the schema exists to prevent. Contrast is
measured against WCAG AA in both themes rather than claimed. The pages have been rendered
and looked at, at desktop and at a true 390px viewport.

**Known and deliberate:** display rule 4 (one-tap flagging) is not met on a static site and
the page says so. The status page's component list is hand-maintained and will drift from
this file. The markdown pipeline is unsanitised, which is safe only because the input is
this repository.

**Live at [navcom.app](https://navcom.app).** Vercel, static output, no serverless
functions — the deploy runs `npm run verify`, so a build that breaks a display rule or the
bundle budget cannot ship. Web Analytics and Speed Insights stay off: both inject a script,
which would break the zero-JavaScript property and H8.

**Data is partitioned by region** — `data/regions/<slug>/` with a manifest carrying country,
IANA timezone, languages and whether anyone has checked it. Done while there was one region,
because it is cheap now and painful once several people are editing one file.

**What is left before this is a real directory:** data. Everything else works.

## One repository

`packages/core` · `packages/watchtower` · `web`. One install, one wire format, one CI run.

The daemon lived in its own repository and built against the self-contained session-one
brief rather than the spec — a summary of a spec is a fork of it. Six divergences resulted:
the state enum, on-call, `last_drill`, provenance, distress position, and a missing callsign
the board needed. **Every one of them became a type error the moment they shared a
package.**

The daemon also found things this side had wrong: a replaceable `10910` outliving its
publisher and reading as a live watch, and the callsign gap. Its runtime validation was
promoted into core, because a client parsing a response needs the same guarantees the
daemon needed.

**One transport, not two.** The CLI had its own send-and-wait and the terminal was about to
grow a second. Two implementations of one wire behaviour agree right up until one of them is
fixed — and the fix that mattered was `Distress` retrying indefinitely, which only one had.
`packages/watchtower/src/client/signal.ts` is now a re-export, and the review findings that
shaped it moved into core **with their tests**: publish-failure reporting, response signature
verification, and not leaving a timer armed when `subscribeMany` throws synchronously. The
CLI's `distress` retries until a human answers and stops only on Ctrl-C.

**A stale `packages/core/dist` produced three phantom type errors** in consumers before it
was made structural rather than remembered: `web` and `packages/watchtower` now rebuild core
in a `pre`-hook before check, build and test. A build step you have to remember is a build
step that gets skipped at the worst time.

## Unblocked — session 1 passed

**Extract the shared core** — **done.** `packages/core` holds the attestation model, keys,
NIP-44 sealing, the four event kinds, the board and the directory library. 88 tests. `web/`
is its first consumer via `file:../packages/core`; the node is the second.

Two rules are now enforced in code rather than only written down: a watch state demotes
`automated-oncall` to `automated` when nobody is pageable or no drill has passed, and hard
expiry can never drop a `distress` entry.

**Field Terminal — connected.** Identity is generated on the device and never leaves it,
the Watchtower pubkey and relays are entered by hand from a person, and Status subscribes to
`10910` and renders what is actually true.

**Verified against real relays rather than argued about.** With the daemon running, a
terminal reads `automated`. With the daemon *killed* and the relay still faithfully serving
its last message, the same terminal renders **Dark** — the replaceable-event corpse, caught
live. A relay answering "nothing here" is read through `oneose`, so absence is a signal
rather than a timeout guess.

**Device storage is tiered** — accruing and wipeable, two keys rather than one, so panic
wipe cannot take the wrong half by accident. Its limits are written where an operator can
read them: a browser has no keystore, and `removeItem` unlinks rather than scrubs.

**Field Terminal — Status screen: done.** Lives at `/terminal/`, same domain and one build,
but in its own route group so it inherits none of the site's chrome, stylesheet or
assumptions. It renders Dark before anything is configured, which is the correct answer
rather than a placeholder, and states the consequence rather than the label.

**Authorship is explicit in the wire format.** `oncall` is a list of authored declarations
rather than a count the node picks; `last_drill` carries an author and an acknowledgements
array; a `20912` names its responder as an author; accountability entries are hash-chained.
None of it requires counter-signing to ship, and all of it makes counter-signing additive
rather than a payload break across three clients and a node.

**Two budgets, and the split is enforced.** The public site delivers **zero** JavaScript
against a budget of zero — it fails on the first byte, because a document must stay readable
with scripting off. The terminal is an application and gets 140 kB; the loop screens bring
its worst page to 84.7 kB.

**Field Terminal — the loop runs through the phone.** Sign on, check in, Query, Assist,
Stand down and Distress are wired to the transport in `packages/core`, so the CLI and the
terminal send the same bytes through the same code rather than two implementations that
agree until they don't.

Three things came out of building the screens rather than reading the spec:

- **`Distress` now ends only on a human.** The retry loop stopped on any acknowledgement,
  including an agent's — which satisfied neither invariant 2 nor invariant 5 while looking,
  on screen, exactly like help arriving. An agent answering is reported as *still looking
  for a human* and the loop continues. A response with **no** `responder.kind` is treated as
  not-human, because guessing is the one wrong guess this loop must never make
- **`assist` carries a required `urgency`.** "I need someone" and "I need someone now" ask
  for different responses, and a watch cannot tell them apart from an absent field. `text`
  stays optional — requiring a reason delays the send at the moment sending matters
- **Every attempt is on screen, including ones that never left the phone.** An operator who
  knows nothing is getting through can act on that; one who believes help is coming when it
  isn't has been misled at the worst possible moment

Sign-on records what the watch said it could do **at the moment of signing on**. It is the
operator's own note, not the node's, and the screen says so — the node-signed version is the
capability receipt, and it lands when the daemon issues one.

**Invariant 7 is reachable.** `panicWipe()` and `burn()` had been written and tested since
the storage tiers landed, and no screen could call either — the one operator action that has
to work in five seconds under duress had no button. `/terminal/wipe/` gives them opposite
shapes on purpose: panic wipe is a hold, because it costs an evening and speed wins; burn
asks the operator to type their callsign, because it costs everything they have built. The
typed gate lives in `storage.ts`, not the template, so a second screen cannot forget it.

The screen says where a wipe **stops**, which is the part worth saying: the watch still holds
your board entry, the accountability log is on the node and is not yours to delete, and a
browser has neither a keystore nor a secure erase. After a wipe it shows nothing at all —
a terminal reporting "4 items destroyed" tells whoever is holding the phone that there was
something to destroy.

**Cached directory — done, and the Field Terminal's screens are complete.** `/terminal/directory/`
is the Dark fallback: something to browse when there is nobody to ask.

**No search box, and a test asserts there is none.** `Query` goes to the watch — someone
with both hands free does the lookup, can ask a follow-up, and can be wrong out loud.
Searching a list one-handed in the cold is the problem the watch exists to solve, so search
here would quietly undo the design.

Three decisions worth recording:

- **Prerendered into the page, not fetched as data.** Caching the page caches the records,
  so there is no second request to fail exactly when it matters — and the records land in
  the built artifact, where the six display-rule tests already scan every `[data-record]`
- **The groups start open**, which is fewer taps in the field and, less obviously, the
  reason the rules are checked at all: a collapsed-by-default accordion would have shipped
  this screen with the records absent from the built HTML and the rules unverified
- **The record rendering is the site's own components, unchanged.** They are the only
  tested implementation of the display rules; a second one styled for the terminal would be
  an untested copy guarding the field where a wrong answer does the most harm. The site's
  tokens are aliased inside `.terminal` instead

**Staleness recomputes on hydration.** A prerendered page freezes confidence into HTML —
that is what the daily rebuild and the staleness margin are for — but the terminal is a
running application and does better: a page cached three weeks ago does not still claim
three-week-old confidence. It also states **how old the copy itself is**, which is the
second age nothing on a record would ever mention.

**Two things this turned up.** Rule 2's regression test compared a suppressed value against
every rendered value *on the page*, which broke the moment many records shared one: a record
with a suppressed `hours` of `unknown` also renders `sex_offender_ok` as the value
`unknown`, a legitimate enum member of a different field. Scoped to the record and field it
concerns. And `burn()` claimed "everything on this device" while leaving the service worker
cache — which now holds the directory. It clears the caches, and the screen awaits it. UI built
against an unproven payload gets rewritten when the payload changes, which is the whole
reason for the gate.

## The accountability log — sprint A done, B/C/D planned

**A — the log is real on the node.** `packages/watchtower/src/daemon/accountability.ts`:
append-only JSONL, fsynced per entry, chain verified at boot, 90-day retention. Actions are
written at one site derived from the response actually sent, rather than a call per dispatch
branch — one branch away from silence is not a property this file can have.

**Two entries record what the watch did not do.** `contact-not-attempted` on every overdue,
because the spec says the node MUST attempt contact and nothing does; `escalation-not-
attempted` on every `Distress`, because the ladder is unbuilt. Neither is
`*-reached-nobody`, which would claim an attempt. They should read badly until they stop
being true.

**Found while planning it: `entriesAbout()` and `verifyChain()` could not compose.** Every
chain link points at the entry before it in the *full* log, which is usually about somebody
else — so a per-operator view can never verify, and an operator is exactly the party who
cannot be handed the whole log. Both functions existed, read as though they worked together,
and returned `intact: false` every time. `CompleteLog` is now a distinct type and the
composition is a **type error**.

That moves the honest claim: chaining closes tampering **for a whole-log reader only**. The
spec's two-row table is now three rows, and the middle one — selective disclosure — is the
load-bearing one.

**Also found: neither package type-checked its own tests.** `fakeConfig` was returning a
`DaemonConfig` missing a required field and nothing complained, which is how a suite drifts
away from the types it exists to exercise. Both now check `src` and `test`.

**B — selective disclosure — done.** RFC 6962 Merkle tree in `packages/core/src/merkle.ts`,
root published as `log_root` on `10910` rather than as a new kind. An operator verifies
their own entries against a root they saw published, holding `log₂(n)` sibling hashes and
nothing about anybody else.

Two properties the obvious implementation lacks, both tested: **domain separation**, without
which an internal node can be passed off as a leaf and membership forged for data never in
the log; and **no duplicated odd leaf**, without which different logs collide on one root.
The suite is weighted towards forgeries — swapped content under a valid proof, a proof from
another tree, a truncated path — because "a valid proof verifies" proves nothing about
whether an invalid one is rejected.

**The client keeps the roots it has seen**, in the accruing tier, surviving a panic wipe. A
replaceable `10910` means a relay serves only the newest root, so without this the watch is
the sole custodian of the evidence against itself. `diverged` — two roots at the same tree
size — is the finding it exists to produce, and it renders **above** the watch state,
because it changes what everything below it means.

**C — retrieval — done.** `log-review` as a sixth `20910` signal type, answered with
`review: { root, entries[{entry, proof}], more }`. `20912` is ephemeral, so the log never
becomes relay-queryable and C27 holds. The request carries **no subject field**, which is
the access control rather than a check that could be forgotten: the node answers about
whoever signed it. Capped at 50, newest first — a response too large for a relay is silence,
and silence is never an answer.

**D — the review screen — done.** `/terminal/log/`.

The hard part was not rendering entries. A response carries entries, proofs **and** the root
they are against, all three from the watch — so verifying them against each other always
succeeds. `checkReview` accepts only a root the device saw published itself, and the screen
says *"marking its own homework"* for the other case rather than showing a tick.

**The limit is stated before the record is fetched, not after.** An operator who has just
read a screen of green ticks is the least likely person to go looking for what the ticks do
not cover — and what they do not cover is omission, which no proof closes.

## Gated on opening past people you personally vetted

**Counter-signed capability.** On-call operators declare their own reachability, drills
carry acknowledgement signatures from whoever woke up, and log entries are counter-signed by
their subjects. The slots exist and are empty; this fills them.

The gate is honest rather than arbitrary. While the circle is people you trust directly, the
node's own account of itself is adequate. The moment the pubkey goes wider, a Watchtower
that vouches for itself is exactly the claim a compromised one has most reason to make.

**Redundant escalation executors.** More than one box able to run the ladder, made
idempotent by distress event id. Duplicate pages are a nuisance; a single executor dying
mid-`Distress` is not. Paging is already specified as parallel rather than serial for the
same reason — in an emergency you want everyone.

This is ranked above decentralising the board on purpose: **a watch going Dark is
survivable and specified. An escalation that never fires is not.**

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

## Declined, not deferred

Some real problems are not on this page at all, on purpose — see
[`declined.md`](declined.md). Everything below is **deferred**: designed, sequenced, and
waiting. The difference matters, because a page where every gap becomes future work is a
page that only grows.

## Not started, and not to be started

Endorsements, presets, funding, propagation mechanics, recovery, allied interop, RelayNode,
Mission Package ingestion.

**A multi-holder Watchtower** — signals sealed to a set of keys rather than one, so several
nodes hold the same board — is a real option rather than an impossibility, and the earlier
claim that "the watch cannot be decentralised" was wrong. What cannot be distributed is
*who is accountable*: one name, because diffused responsibility means nobody acts. The board,
query answering and escalation can all be held by more than one party.

It is deferred on a cost rather than a principle. Sealing to M keys means M parties hold the
operational picture, and the threat model here is doxxing — so decentralising the board
widens exposure while narrowing dependence. That trade needs a reason, and one box run by
one person for a handful of people they trust is not yet it.

Each is designed. None is scope. A spec written before the loop is proven is a guess in a
more confident format — [`spec/README.md`](spec/README.md) says so about itself.

## Open decisions

| | Blocks |
|---|---|
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
