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

## The escalation ladder — built, unproven, and running with nobody on-call

Invariant 2 had nothing behind it until now: every `Distress` the daemon received wrote
`escalation-not-attempted` to the accountability log. It no longer does.

**The seven failure modes are tests, and they are the interface.** Six are in
`packages/core/test/escalation.test.ts`, numbered to match the spec so a later reader can
check the list is still complete rather than taking anyone's word. The seventh — *node down
at time of distress* — is the one failure the node structurally cannot report on, so it is
tested on the client instead, and its absence from that file is noted there as a decision.

**The executor gets its trigger from the relays, not from the daemon.** A design where the
daemon receives the `20911` and hands it over satisfies "separate process" on paper while
leaving a hung daemon able to take escalation down with it — the requirement failing in
exactly the way it was written to prevent. The cost is two processes holding the Watchtower
key, and it is the right trade against an escalation path that depends on the component most
likely to hang.

**No provider is embedded.** A channel names what was registered; the node runs a configured
command per on-call entry, argv rather than a shell string. Anything else puts a third party
in the one path that must not depend on anybody's uptime but the node operator's own.

**The `responder` field on a transition is load-bearing.** A client stops retrying on a
`human` responder, so a machine saying *"paging"* must not be authored as one — that would
end a `Distress` with nobody on the other side while looking like it worked. Only the
acknowledgement carries a human author, and it carries the actual human's callsign.

**What is still missing, and it is most of the value:**

- **No drills.** `last_drill` stays null, so `automated-oncall` still publishes as
  `automated`. Weekly randomised drills, published to the status page, are next
- **No roster anywhere.** A `Distress` today pages nobody, reaches the end of the ladder at
  once, and says so. That is the ladder working correctly; it is not the ladder helping, and
  the status page says exactly that
- **No node-side emergency contact.** The spec prefers device-initiated anyway, so
  `CONTACT` is currently always skipped — failure mode 5, which is tested

## What is left, and who has to do it

Four rules govern this table, and they exist because a plan can fail in ways a feature list
cannot.

1. **Every item has a fate** — do, defer, or [decline](declined.md). A list that only ranks
   is a list nothing ever leaves
2. **Sequence comes from [`principles.md`](principles.md)**, not from whoever is writing.
   *Never the people served → operator safety → accuracy → the field runs standalone →
   opt-in → no feed → everything else*
3. **Every item names an owner** — agent, human, or either. Directory data, playbooks and
   the `type` taxonomy are **not agent work**, and an item with no owner is an item nobody
   does
4. **Every item names what *not* doing it costs.** If that cost cannot be stated, the item
   should be declined rather than deferred. That is the test, not a formality

No dates. A volunteer network's capacity is not knowable in advance, and a plan with dates
in it is a plan that is wrong.

### The seven ways people actually work, and who is served

| | Today |
|---|---|
| Solo on patrol | **Nothing.** Cannot get past setup. Item 0 |
| Team on patrol, no leader | **Nothing.** No way to see each other. Item 0a |
| Team on patrol with a leader | **Nothing**, and there is no concept of a team anywhere in the product |
| Solo on watch | **Well served.** This is what got built first |
| Team on patrol, watcher at home | Served — but the watcher sees a flat list with no grouping |
| **Agent on watch** | Holds the board, answers questions, and **cannot close a `Distress`** — an agent is never the sole responder [invariant 5]. A 24/7 agent watch is a query desk, not a safety net, and anyone setting one up should be told that in those words |
| Team on watch | Handover is specified and unimplemented, and a phone-held watch makes it nightly |

Four of seven are unserved or barely served, and three of those four are the ones that need
no watch at all. That is what items 0 and 0a exist to fix, and it is why they come before
work on the watch itself.

### Two things reorder this list

**First: drills are gated on the roster, and the roster is gated on a person, not on code.**

A drill run today pages nobody, succeeds at doing nothing, and records `pass`. That `pass`
would then flip `automated-oncall` into publishable on the strength of a test that exercised
nothing. `navcom-escalation --check` exists to prove a channel works before anyone relies on
it, and it refuses an empty roster rather than reporting success.

**Second, and it moves what comes first: without a box, the watch sleeps when people do.**

Native apps are deferred, so there is no background execution on anyone's phone. A
phone-held watch is up only while somebody has the app open and is looking at it — which is
exactly what the `console-open` channel means, and why the spec already refuses to count it
for someone going to bed.

The consequence, stated rather than discovered: **for a squad with no box, `Distress` after
everyone falls asleep reaches nobody.** The ladder handles that correctly — it says nobody
is coming — but saying it is not the same as covering it.

So the operator's **own emergency contact moves to the front of the list.** It is the only
part of the safety net that does not need a box, a roster, a native app or anybody awake.

It cannot be silent, and that limit is real: a web app can open a message composer or a
dialler, but the operator has to tap send. So it is not cover for being unconscious — the
case [`declined.md`](declined.md) already says this system does not cover. What it is: a
lone operator holding Distress, and their own person being one tap away at that moment
rather than four screens and a memory of a phone number.

### Operator safety

| | Item | Fate | Owner | Cost of not doing it |
|---|---|---|---|---|
| 0 | **The app works with no Watchtower at all** | **before everything** | agent | **A solo operator currently cannot use NavCom.** Setup demands a pubkey "handed to you in person", so anyone who knows nobody is stuck on "Not configured" forever and Sign-on, Query, Assist and Distress all refuse. The most common user is the one the product turns away at the door |
| 0a | **Peer pairing and presence** — QR, sealed to peers, heartbeat | **before the watch work** | agent | Two of the seven ways people actually work get *nothing* today: a team out with nobody home, and a team whose leader is also on the street. Both need to see each other, and neither needs a watch, a server or a leader to do it |
| 1 | **Your own person, one tap away** | **first** | agent | Reordered — see below. Without a box and without a native app, this is the entire safety net once everyone is asleep. It works for a lone operator, needs no watch, no roster and no server |
| 2 | **One human on-call with a proven channel** | needs a box | **human** | Real paging all night needs something that stays awake. One config entry and one command that works |
| 3 | **Drills** — weekly, randomised, published | after 2 | agent | `last_drill` stays null, so a watch that *"cannot demonstrate a passing drill is presumed broken"* is permanently presumed broken. Also the Sleeper's main mitigation |
| 2a | **Keyless pagers** — several, run anywhere, holding no key | with 2 | either | A `20911` is visible on relays without being readable, so waking people up needs no trust. This is redundant executors, made cheap: run three, learn nothing, and a missed page stops being one machine's fault |
| 3a | **Web push as a paging channel, sent by the box** | after 2 | agent | The one native-grade capability a web app already has on both platforms — iPhone included, since 16.4. It is how an on-call person gets woken without an app store. The box holds the subscriptions, so no new third party beyond the browser's own push service |
| 4 | Redundant executors | **defer — blocked on hardware, not code** | human | A single executor dying mid-`Distress`. `LadderRegistry` is already idempotent by event id; there is no second machine |
| 5 | **Native apps, both platforms** | **deferred — decided 2026-08-19** | agent | Deprioritised deliberately. Native adds three things: `Distress` from a locked screen, silent SMS, and a phone holding the watch overnight. All real; none blocking. The web app is the surface and it stays complete, which is what this page always said |
| 5a | **Live position sharing** — off by default, four settings: off / area name / ~500m / exact | do | agent | A `Distress` carries the last known position or nothing. **Live only, never a track** — where somebody *was* is the single most dangerous thing this system could hold, and it is what anyone trying to unmask an operator wants most. It lives with the list of who is out, expires with it, and never reaches the permanent log |
| 5b | **Buddy pairing** — two solo operators watching each other's check-ins | do | agent | Probably the most common real arrangement after pure solo: two people who patrol alone, on different nights, who agree to watch each other. Not a squad — no shared callsign, no shared anything. Needs almost nothing new |
| 5c | **Battery state** | do — small | agent | A phone at 8% is a safety fact, not a UI detail. It matters to the operator carrying it, and to everyone else if that phone is holding the watch |

### Accuracy

| | Item | Fate | Owner | Cost |
|---|---|---|---|---|
| 6 | **Console: a declaration must not read as a safety monitor** | with the Console | agent | Stated in [`declined.md`](declined.md). The Team Lead reads "active" as "fine". Wording and layout, not mechanism |
| 7 | **Never write "anonymous" where "pseudonymous" is true** | do — small | agent | The Convert's highest-stakes overclaim, and the words are not written yet |
| 8 | Counter-signing | defer — gate holds | agent | Closes omission. Not needed while the circle is people vetted personally |
| 8a | **Saying no to an `Assist`** | do — small | agent | Right now the only ways not to help are silence and guilt. "Not tonight" should be a real answer that closes the request. **Never counted, never tallied** — a tally of declines is a compliance metric and the rules kill it |

### The field runs standalone

| | Item | Fate | Owner | Cost |
|---|---|---|---|---|
| 9 | **Directory data** | ongoing | **human, local knowledge** | *"What is left before this is a real directory: data."* Everything else works |
| 10 | **Playbooks** | ongoing | **human, permanently** | Not agent work. Confident wrong guidance is the Medic's kill trigger |
| 10a | **Your own patrol record, and a safe way to publish it** | do | agent | See below — it is already a requirement, and the argument for it is that withholding it does not stop anyone sharing |
| 10b | **Coming home** — stand-down confirmed by name | do — nearly free | agent | *"Wren, 02:14, home."* The close of the night. Ranked the single best value-for-cost item in [`what-fiction-skips.md`](research/what-fiction-skips.md) and still not built |
| 10c | **Weather** — warming and cooling centres open on conditions, not schedule | do | agent | The field already exists (`seasonal: weather_activated`). Below freezing changes the whole shape of a night: different destinations, different urgency, different supplies. An operator needs that before they leave |
| 10d | **Supplies** — socks, water, hygiene kits, naloxone | do | either | Mundane, and it is what keeps a team functioning week to week. Must survive several people editing offline at once and resolve without a merge screen |

### Your own patrol record

Lots of RLSH stream their patrols and post the footage. Their own activity is not a secret,
and pretending otherwise would be designing for somebody who does not exist.

**So the record is theirs, and publishing it is theirs.** The requirement is already written
down under the Public Face: *give him something designed to leave the app, or he will
screenshot something that shouldn't.* Withholding a safe export does not stop anyone
sharing — it just guarantees the sharing is done badly.

Three lines it must not cross:

- **It contains nobody but them.** Your movements are yours to publish. Raven's are not, and
  Raven did not agree to anything. A record that names who you were out with, without their
  say-so, publishes somebody else's whereabouts
- **It contains nothing about anyone served.** No query text — *"bed tonight, fleeing
  partner, has a dog"* is a person's situation, and it is the one thing that is never
  recorded anywhere [invariant 1]
- **Coarse by default when it leaves.** The stream showed a street corner; the export should
  not carry GPS coordinates the stream never did

What it holds is what a paper logbook would: date, area, out and in, how long, and whatever
the operator wrote themselves.

**Where it lives is the operator's choice, made once and priced honestly.** Kept across a
panic wipe, a year of patrols survives a bad night — and a seized phone shows a year of
patrols. Off by default. The Protest Medic wants it off; the Public Face wants it on; both
are right about their own situation, which is exactly the kind of choice
[`principles.md`](principles.md) says an operator may make for themselves.

### Everything else

| | Item | Fate |
|---|---|---|
| 11 | **Watch as a mode of the app**, beyond item 6 | do — this replaces the Console-from-the-box plan |
| 12 | **Mecha Jono holding the board** | defer — session 2, and it is one function call. Everything in [`agents.md`](watch/agents.md) is about what happens *around* it |
| 13 | Endorsements, funding, propagation, recovery, RelayNode | defer — designed, not scope |
| 14 | **Multi-holder Watchtower** | **unblocked** — a squad with no box is the reason it was waiting for |
| 15 | **Native Android/iOS** | defer to Mk1 — decided |

### Awaiting a decision

**Mission Package ingestion has a fate now.** It is a thing Starcom *produces*; NavCom does
not consume one today and does not need to. The relationship is one way and small: **Starcom
is intelligence and strategy, NavCom is field and tactics.** NavCom is complete without it,
and sends de-identified patterns upward if and when there are any. Revisit when there is
real traffic, not before.

**`presets`** still cannot be given a fate, because nobody can currently say what it is.

## Declined, not deferred

Some real problems are not on this page at all, on purpose — see
[`declined.md`](declined.md). Everything below is **deferred**: designed, sequenced, and
waiting. The difference matters, because a page where every gap becomes future work is a
page that only grows.

## The multi-holder Watchtower — no longer deferred

**A multi-holder Watchtower** — signals sealed to a set of keys rather than one, so several
nodes hold the same board — is a real option rather than an impossibility, and the earlier
claim that "the watch cannot be decentralised" was wrong. What cannot be distributed is
*who is accountable*: one name, because diffused responsibility means nobody acts. The board,
query answering and escalation can all be held by more than one party.

It was deferred on a cost rather than a principle. Sealing to M keys means M parties hold
the operational picture, and the threat model here is doxxing — so it widens exposure while
narrowing dependence. That trade needed a reason.

**The reason arrived: a squad with no box.** Four RLSH who patrol together have nobody
willing to run a machine, and requiring one meant they could not have a watch at all. Inside
a squad the exposure is not new — all four already know who is out. That is what being a
squad means. Outside one it would be, which is why the box arrangement stays.

Everything deferred above is designed, and none of it is scope. A spec written before the
loop is proven is a guess in a more confident format — [`spec/README.md`](spec/README.md)
says so about itself.

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
