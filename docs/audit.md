# The 27 passes

Nine built milestones, three lenses each. Started 2026-08-21.

**Why the count is specified.** Left to its own judgement an agent does one broad sweep,
finds the cross-cutting class of problem, declares the class fixed and stops — which is
genuinely useful and genuinely not the same thing. The findings that matter most are local to
one milestone's logic and only surface when somebody sits with that milestone specifically.
The ceremony is the point.

## The lenses

| | What this pass is looking for |
|---|---|
| **R — Robustness** | Hostile, huge or malformed input. Resource exhaustion. Two tabs. A wrong clock. A relay serving garbage. A peer that is not a peer. What happens under conditions nobody designed for |
| **E — Error handling and reporting** | Does a failure surface at all? Is the message true? Does it point at something the operator can do? Does anything fail in a way that looks like success? Which catches hide a real problem rather than an expected one? |
| **X — Edge cases** | Empty, one, and too many. Boundary values. Unicode and long strings. Duplicates and ordering. First run and last item. Timezones, DST, and the turn of a year |

## The grid

Each cell is a pass. `—` not started, `✓` done, and a note when it found something.

| Milestone | Surface | R | E | X |
|---|---|---|---|---|
| **0** Prove what is built | Browser harness, service worker, offline, seeding, the verification layer itself | **✓** | **✓** | **✓** |
| **1** One operator alone | Display rules, patrol record, contact, wipe, seeder | **✓** | **✓** | **✓** |
| **2** One watch staffed | Executor, pager, drills, web push, on-call | **✓** | **✓** | **✓** |
| **3** Two who met once | Peers, presence, cards, invites, public presence, buddy | **✓** | **✓** | **✓** |
| **4** Squad with no box | Watch mode, group sealing, board, handover, watch key | **✓** | — | — |
| **5** Written-down properties | PQC, declined, battery, RTL, watch-state v4 | — | — | — |
| **6** Knowledge gets in | Corrections, merge, needs-checking, notes, promotion | — | — | — |
| **7** Standing | Credentials, claims, revocation, the watch gate | — | — | — |
| **9** No single point of failure | Backup and restore, capability sentence, funding | — | — | — |

## Rules for a pass

1. **Read the surface first.** Not the tests — the code, and what it assumes
2. **Probe rather than reason.** Twice today a bug survived because both halves were tested
   and the join was not. A pass that only reads will miss the same thing again
3. **A pass that finds nothing says so.** Manufacturing a finding to look thorough is worse
   than an honest empty pass, and it buries the real ones
4. **Fix what is found, in that pass.** A list of known defects is a worse artifact than a
   smaller list of fixed ones
5. **Test counts move the right way.** A total that drops means something was destroyed —
   which has already happened once, to thirteen tests covering invariant 7

## Banked before the grid existed

A cross-cutting robustness sweep ran first and found three things, all fixed:

- **Every wire boundary was uncapped** except two fields that happened to have `maxlength` on
  a textarea. A crafted correction could carry a megabyte onto every device caching that area
- **A full phone stopped saving silently**, so an operator lost their patrol record and found
  out by looking for it later
- The quota detection I wrote to fix that **matched the error message rather than its name**,
  and misclassified anything else that mentioned quota

Those are cross-cutting and are not credited to any cell below. The grid starts from zero.


---

## 0.R — Milestone 0, robustness

**Found: `cache.addAll(SHELL)` was all-or-nothing.** It rejects if any single request fails
and adds nothing at all, so one 404 after a partial deploy failed the whole install,
`skipWaiting` never ran, and **the terminal had no offline capability whatsoever** — while
looking entirely fine, because it fails on a screen that is online. The operator finds out in
a car park.

This is Milestone 0's own foundation: every offline guarantee elsewhere rests on that install
succeeding. Fixed by caching each entry independently and recording what failed.

**A test was written for it and then deleted.** It aborted an asset and asserted the shell
still worked — and passed identically against the broken version, because Playwright's
request interception does not reach a service worker's own fetches. A test that passes either
way is not evidence, and keeping it would have made the next person confident about something
unverified. `Cache.addAll` atomicity is specified behaviour rather than something this
harness can observe, and the spec file says so.

## 0.E — Milestone 0, error handling and reporting

**Found: three screens promised *"works with no signal at all"* and nothing ever checked.**
The mechanism to check had been there the whole time — the Cache API is readable from the
page — and was simply never consulted. The same shape as a claim with nothing behind it,
except the thing behind it existed.

Most operationally: the directory picker says *"opening it is what saves it"*, which is true
and says nothing about whether it worked. An operator who believes they are carrying
St. Louis and is not finds out with no signal.

Now checked rather than promised. The picker marks areas actually on the phone; Status
reports a shell that did not finish saving. **Absence of an answer is not an answer** — a
browser with no Cache API reports `unknown` rather than `no`, because saying "you are not
carrying this" when we cannot tell would invent a fact.

**Not a product bug, worth recording anyway:** a whole spec file failed at once mid-pass
because the preview server was serving a half-written build while `npm run build` was still
running. Re-running serially passed. Chaining a build into a test run races the harness.

## 0.X — Milestone 0, edge cases

Two findings, both about a boundary nobody crosses on purpose.

**A deploy threw away every area an operator was carrying.** The cache name carries the build
version, so activating a new one deleted the old cache whole — and directory areas live there
too, added on visit rather than shipped in the shell. Carry St. Louis, open the app once on
wifi after a deploy, go out with no signal, find nothing. *"Opening it is what saves it"*,
quietly revoked by an unrelated event.

Areas are now carried forward before the old cache is deleted. **This one has real evidence**:
the test fails without the migration and passes with it, which was checked in both directions
after the `addAll` test turned out to prove nothing.

**Corrupt storage was indistinguishable from a first run.** Reading it as empty is right — a
terminal that will not start because of a bad key is worse than one that asks to be set up
again — but presenting it as a *fresh phone* is a different and worse lie, and the next write
destroyed the only copy. A damaged blob is JSON in localStorage and can often be read by
hand, so it is now kept under a salvage key and Status says not to clear the site's data.

## 1.R — Milestone 1, robustness

Four findings, and two leads that honestly went nowhere.

**A future date was the freshest thing possible.** `ageInDays` subtracted and returned a
negative, so `last_verified: 2099-01-01` rendered *fresh, high confidence* — and stayed that
way forever. On its own that is a display bug. Against Milestone 6 it is an attack: corrections
tie-break on `last_verified`, so anybody could date one 2099 and own a field permanently. One
day of tolerance is kept for timezones; beyond that a date in the future is unparseable and
reads *call first*, which is what invariant 9 asks for.

**`area` was uncapped on every signal.** The earlier cross-cutting sweep capped `text` and
walked straight past the field beside it — a `Distress` carries both, and only one was
checked. It lands on whoever is holding the board.

**A `#` in a phone number destroyed the distress message.** `smsLink` interpolated the number
into a URI, so an extension or a DTMF digit — `555-1234#22`, an ordinary address-book entry —
made everything after the `#` a *fragment*: the number truncated and the entire help text was
dropped. The operator taps the one-tap safety net and gets a blank message to a wrong number.
For an operator with no on-call this is the whole safety net, and it failed silently.

**The salvage copy survived panic wipe [invariant 7].** This one was created by 0.X. Keeping a
corrupt blob under `.damaged` so it can be recovered by hand is right; leaving that copy
outside the destroy path is not. A phone whose wipeable storage had ever been corrupted kept a
readable copy of it through a wipe — the operator holds the button down, watches it clear, and
it is still there. Both destroy paths now take their keys from one list, so a new key cannot be
added and missed. Checked in both directions: the tests fail against the old wipe.

**Two leads that went nowhere, recorded because rule 3 says so:**

- *Unbounded patrol growth.* `recordPatrol` appends forever with no cap, which looks like the
  classic exhaustion bug. Measured instead of assumed: one patrol is 125 bytes, so a thousand
  is 122 kB and five thousand is 610 kB against a 5–10 MB quota. A decade of daily patrols
  fits. No cap is warranted, and adding one would have thrown away the operator's record to
  fix a problem that does not exist
- *The CSV seeder.* Probed with a BOM, CRLF, quoted commas, embedded newlines, ragged rows and
  a duplicate header column. It handled all of them. Worth noting that a contributor dropping a
  middle column now degrades *correctly* because of the first finding — the shifted
  `last_verified` is unparseable, so the record reads *call first* rather than inventing a date

## 1.E — Milestone 1, error handling and reporting

**The failure that was reported to nobody.** The cross-cutting sweep made `write` return
whether it had saved, and left a comment saying *"the screens that write ask."* **Not one of
the thirty-odd call sites checked the boolean.** The only reader anywhere was Status, which
read the message once, at mount. So an operator whose phone was full closed a patrol, saw it
accepted, and was told nothing — unless they later opened a different screen, which then
reported a failure from some earlier moment with no indication of what had not been saved.

This is the shape the lens is looking for: a fix that made the *layer* honest and stopped
there. Storage now notifies, and the banner lives in the terminal layout, so it appears on
whatever screen the operator is on at the moment the write fails. It is one place rather than
thirty because a report that each call site has to remember is a report that will be missed
again — that is precisely how this went unreported for two milestones.

**And the one that lost the record rather than merely failing to save it.** `setKeepHistory`
moves the patrol log between tiers when the operator changes their mind about surviving a
panic wipe. Three unchecked writes: copy the log to the new tier, clear the old one. On a full
phone the copy failed and **the clear ran anyway** — so the one operation whose entire purpose
is not losing the history was the thing that destroyed it, on the device least able to afford
it. The source is now cleared only once the copy has landed, and the setting is put back if it
did not, so the record is always where the operator's setting says it is.

Both are checked in both directions, and the browser tests prove an operator actually sees it
rather than that the mechanism exists — the layout banner is the kind of thing that would
otherwise sit there unreachable.

**Nothing found in three places:** the seeder's build-time errors are the best in the codebase
(they name the file and explain *why* ids are global, so the contributor can act); the contact
errors say what to do; and the display rules already answer invariant 9 correctly for a missing
date.

**Two notes on the harness, not the product:**

- The build/preview race from 0.E **recurred** — chaining `npm run build` into a Playwright run
  served a half-written build and failed both new specs. Re-running serially passed. It is
  worth a script rather than a note next time it happens
- The RTL suite caught the banner using `border-left`. Working as intended, and a reminder that
  a fix written in one pass can break a property established in another milestone

## 1.X — Milestone 1, edge cases

**A night patrol read as ending before it started.** The export rendered
`Dec 31, 2025 · 10:00 PM–02:00 AM`, which says a patrol ended four hours before it began.
Crossing midnight is not an edge case for this product — **it is the ordinary case**, because
patrols happen at night, and the export is the one artifact deliberately designed to leave the
app and be pasted into a post or a grant application, where a reader who cannot tell whether
the log is wrong has no way to ask. Now `(next day)`, or `(+N days)` for a sign-off somebody
forgot. Checked across the turn of a year and across spring-forward, where 01:30–03:30 local
correctly reads as one hour.

**An operator could be refused their own callsign while trying to destroy their phone.**
`José` is one code point or two depending on which keyboard produced it, and the two render
identically. The burn gate compared the raw strings, so somebody who set up on one device and
confirmed on another was told their callsign did not match — while looking at a name identical
to what they had typed, under whatever circumstances make a person burn a device. Compared as
NFC now, deliberately not NFKC: canonical equivalence is the same character written two ways,
and this gate ends in destroying everything.

**A patrol record that was not a list threw out of sign-off.** Reachable through a restored
backup or a hand-edited blob, and it surfaced as a sign-off button that did nothing and said
nothing. Read as empty now, which is the same call the corrupt-storage path already makes.

**Nothing found in the seeder.** The obvious lead was that `loadAll` throws for a CSV with no
manifest but not the reverse, and thirty-odd seeded regions do have zero records — so the
picker looked like it would offer an area whose page was never prerendered. It already filters
on record count, and the comment there says why. Checked rather than assumed, and it was
already right.

## 2.R — Milestone 2, robustness

**A stranger can page your on-call human as many times as they like.** Measured, not argued:
three hundred `20911` from three hundred fresh keys produced **three hundred pages** to a real
person's phone, and three hundred ladders that were never released. Nothing here is
privileged — the watch's address is meant to be handed out, and a signed Distress costs a key
made a second ago.

This is not a denial of service against a server. It is an attack on the one mechanism in
this system where failure means somebody is hurt, and `CLAUDE.md` already names the kill
trigger: *alarm fatigue destroys the one mechanism where failure means someone is hurt.* A
pager that has cried wolf four hundred times is not answered on the night it is real, and no
amount of correct ladder logic survives that.

Bounded now, at twenty pages an hour by default — generous enough that a real night never
reaches it, and passed by a flood in under a second. **The bound does not weaken invariant 2**,
which is the whole question: past the budget the ladder still opens, the operator is still
told, and what they are told is that nobody could be paged. The ladder is allowed to fail. It
is never allowed to fail silently.

**And one found on the way: a failed page was reported as a successful one.** Every channel
could exit non-zero — a dead gateway, a missing binary — and the operator was still told
`"Paging Wren."` The dispatch result went to the log and nowhere else. That is invariant 2
failing in exactly the silent way it forbids, and it needed no attacker at all. The node now
adds what only the node knows; the ladder's own sentence describes a state machine that cannot
see a command's exit status.

**Ladders accumulated forever.** Every ladder ever opened stayed resident and was walked once
a second, on a box meant to run for months. Terminal ladders are dropped after a retention
window; **live ladders are never dropped at any age**, because a `paging` ladder that vanished
would stop escalating with nobody told.

**What was deliberately not changed.** The executor answers a `Distress` from anybody, not
just from known operators. Restricting that would need an enrollment step this build does not
have, and it changes *who a watch will answer* — a much larger decision than a rate limit, and
not one to make inside an audit pass. The budget was chosen precisely because it bounds the
harm without deciding that question.

Spec, example config and failure-mode list all updated; two new numbered failure modes.
Checked in both directions — the three flood tests fail against the unbounded version.

**Method note, and this one is mine rather than the code's.** I had been running the watchtower
suite as `npx vitest run --root packages/watchtower`, which bypasses npm scripts and therefore
the `pretest` that builds core. Watchtower resolves `@navcom/core` to `dist/`, so those runs
were testing **whatever core last built**, not core as written. It surfaced here only because
a brand-new core method was missing at runtime. Use `npm test --prefix packages/watchtower`.

## 2.E — Milestone 2, error handling and reporting

**One weekly drill paged everybody roughly six hundred times.** A drill waits out its
acknowledgement window — ten minutes by default — before it can record a result, and the sweep
that decides whether one is due runs every second. Nothing marked a drill in flight, so the
sweep started a new one every second for the entire window, each paging the whole roster.
Measured at four pages in five seconds with a six-second window; the shipped default is a
hundred times longer.

**No attacker is required.** This is the ordinary weekly drill, and the mechanism built to
prove the pager works *without wearing it out* was the thing most likely to destroy it. It is
also worth noting that 2.R's page budget would not have caught this — drills page directly,
and deliberately still do, because a real `Distress` must never be refused because a drill
spent the budget.

Fixed with an in-flight flag, and by re-arming the schedule *before* the window is waited out
rather than after — otherwise a drill that throws leaves `nextAt` in the past and every
subsequent sweep considers a drill due, which is the same storm arrived at by a different
route.

**A watch whose drills stopped ran three months on a dead pass.** Nothing anywhere considered
a drill's *age*. The demotion rule already handled an absent or failed drill, and a stale one
walked straight past it: an executor that died in June leaves a passing June drill in the file,
and the daemon goes on advertising `automated-oncall` on the strength of it. An operator signs
on and reads a clean sentence. **A dead safety check read exactly like a healthy one** — and
this is the case that arrives on its own, without anything going wrong on the night.

Invariant 9 says volatile data shows its age. A drill result is the most volatile thing this
system publishes and it was the one piece that did not. Two weeks — two drill cycles — now
demotes the claim and puts the age in the sentence. `station` is deliberately unaffected: a
human at the console is present regardless of what a drill says.

**And the sentence was not true.** `"No drill has ever passed."` was printed for three
different situations, and only one of them supported it — `last_drill` is the *last* drill, so
a failure today says nothing about last month. Now: never run, last one failed, or passed *N*
days ago, each said plainly.

**Two smaller ones on the same path:** a drill result was logged *after* it was written, so a
filesystem that refused the write threw past the log line and the entire product of a safety
check vanished — not in the file, not in the log, nowhere. And that write failure was silent;
it now says what the consequence is, that the watch will keep publishing the previous drill.

**Nothing found in the keyless pager**, and it is worth saying why: `pager/decide.ts` already
had per-operator rate limiting, multi-relay dedup and an age check, with the reasoning written
out. **The defence existed in this codebase already — in the component that is not
safety-critical.** The executor, which is, had none of it.

**Method note.** `npx vitest` does not typecheck. Two test fixtures written in 1.E used `null`
for fields typed as optional strings and passed anyway; `tsc --noEmit` caught them here. Run
the typecheck, not only the tests.

## 2.X — Milestone 2, edge cases

**Nobody declared on-call in a config file could acknowledge anything.** The executor matches
an acknowledgement by comparing `author.pubkey` to the signing key. **The config parser had no
`pubkey` field**, so every entry a config file could produce carried none, and `undefined`
matched nobody. In any real deployment every ack was refused, every ladder ran to `EXHAUSTED`
while somebody was on their way, and **every drill failed forever** — which then demoted the
watch permanently under 2.E's own rule.

Every existing test passed because the test helper takes a pubkey and builds the entry by
hand. **The ack path was covered only in a shape production cannot create.** That is the same
class as *a mechanism nobody can reach is not built*, one level down: the mechanism was
reachable in the tests and unreachable in the product.

`pubkey` is now a config field, validated as 64 hex at load rather than at 3am. It stays
optional, because somebody on-call by phone who does not run NavCom is a real arrangement —
but a roster where **nobody** can acknowledge is announced at startup in the same block the
empty-roster warning uses, since it has the same consequence and none of the visibility.

**A backwards clock stalled the ladder for the length of the jump.** Window arithmetic is
wall-clock, on a box that may have no battery-backed clock and syncs NTP after boot — an
hour's correction is ordinary there. Elapsed time went negative and the ladder simply stopped:
the operator waits out the entire jump before being told nobody is coming. Re-anchored now,
which bounds the damage to one window, and deliberately **not** reported — a clock correction
is not a transition and the operator has no use for hearing about it.

**`Wren, Wren, Wren answered.`** A client retries its acknowledgement and several relays
deliver each attempt, so a drill recorded the same human repeatedly — and that list is
published in `10910`, where three entries read as three people having woken up. A roster's
depth is the one thing a reader is trying to judge from it. Deduplicated by key, falling back
to callsign.

**And a push registration that could never be encrypted passed both ends.** `getKey` can
return null; the browser encoded that as an empty string and returned a `Registration` that
looked complete, and the node checked the keys were *strings* without checking they were
anything. Both halves were reasonable and the join was a hole — the same shape that has now
appeared three times in this project. The browser refuses and unsubscribes; the node requires
non-empty.

## 3.R — Milestone 3, robustness

**The pairing inbox is the one place a stranger's traffic reaches an operator's screen
without their consent** — the contact key is published, because that is what a card is for —
and it was unbounded. Worse, each arrival copied the whole map, so it was quadratic: five
thousand invites cost **twelve and a half million property copies and four seconds on a
laptop**. On the device floor that screen is gone, and the peers list goes with it.

Capped at fifty, which is far more pairing requests than a real person receives. **The cap is
only defensible because of the two things beside it**: the operator is told plainly that
requests are being turned away, and there is one control that clears them all. A capped list
that empties fifty taps at a time is one nobody can recover from, which would make the cap the
attack rather than the defence. The trade is stated rather than solved — a flood that arrives
first does block a later real invite, and the answer to that is the operator's, not a cleverer
eviction rule.

**A peer list that was not a list broke pairing and presence**, the same class 1.X found in
the patrol record and reachable the same way — a restored backup, a hand-edited blob. It threw
out of `pair` and `peerPubkeys`: a pairing button that does nothing, and a presence
subscription that never starts, neither saying why.

**Nothing found in two places.** A hostile invite cannot carry a huge callsign — `readInvite`
caps it, and the cap holds at the point of read rather than the point of display. And presence
is only accepted from keys already paired with, checked inside `readPresence` rather than by
the caller.

### The harness gained the thing it was missing

No browser test in this suite could check what happens when something **arrives**. The e2e
socket is deliberately dead — right for almost everything here, since most of these tests are
about a phone with no signal — but it meant every behaviour driven by relay traffic was
reachable only in unit tests with the pool mocked out. That is a large blind spot with six
passes left that are mostly about traffic: presence, the board, handover, corrections.

`seedDevice` now takes `relayEvents` and swaps in a socket that speaks enough of the protocol
to replay them against a `REQ` filter. The flood banner and its clear control are proven in a
real browser rather than asserted from a unit test, which is what this project's own rule
asks for.

## 3.E — Milestone 3, error handling and reporting

**Pairing is two halves and only one of them is local.** Accepting an invite pairs the peer on
this device and publishes a reply carrying your key back. `await Promise.allSettled(publish)`
**discarded its result**, so an operator accepting with no signal — the ordinary state of a
field terminal — added the peer to their own list, sent nothing, and was told nothing. They see
the peer; the peer never hears.

For a **buddy** that is the sharpest form: buddy pairing means somebody watches your patrols,
so a reply that never left means **nobody is watching while the operator believes somebody
is.** That is invariant 4's mistake made one person at a time.

`accept` now reports whether the reply actually reached a relay, and the screen says so in
those terms — *"You have Raven, but they do not have you."* There is deliberately **no retry
queue**: invites are held in memory precisely so there is nothing to expire, migrate or leak
into a wipe, and adding an outbox to fix this would trade a stated design decision for a
convenience. The retry is the operator tapping Accept again, so the request stays on screen
when the reply fails and `accept` was made idempotent — the second tap must not be refused for
a pairing the first one made.

**The same discard, one screen over.** `Find` marked an invite `Sent.` unconditionally, so an
operator with no signal watched it succeed and then waited for a reply to something that never
left the phone. Now it says it did not reach a relay, and offers *Try again*.

**Nothing found in the branch that looked worst.** `accept` and `invite` both bail early on
`urls.length === 0`, silently — but `relays()` falls through to a shipped default list and can
never return empty, so that branch is unreachable. Left alone rather than dressed up as a fix.

### Two harness faults, both of which manufacture false results

**Playwright was reusing another project's server.** `reuseExistingServer` on port **4173** —
Vite's default, and therefore every Vite project on the machine — meant a run navigated to a
completely different application and failed waiting for a hydration flag it would never set.
It reads exactly like a bug in the screen under test, and I spent a probe cycle on it. NavCom
now has a port of its own. Worth stating plainly: this can produce a false *pass* as easily as
a false failure, and nothing about the output says which application answered.

**And the harness needed to be able to refuse.** A relay that accepts subscriptions but
rejects publishes is a phone on bad signal, which is where half of this app's *"it worked"*
messages were being printed. `seedDevice` takes `refusePublish` now, which is what made the
half-pairing warning provable in a browser rather than asserted from a mock.

## 3.X — Milestone 3, edge cases

**How fresh a peer looks on your screen was decided by their phone's clock.** Presence
recorded `heard: read.at` — the timestamp the *sender* stamped — and measured staleness
against it. A peer ten minutes slow **read as unknown while actively out**; one an hour fast
**read as out for half an hour after they had stopped**. The second is the dangerous
direction: it tells a buddy somebody is fine when nothing has been heard, which is exactly
what this module's own opening rule forbids.

One field was doing two jobs. Their timestamp is the only thing that can order two of their
own heartbeats, so it is kept as `at` and used for nothing else; `heard` is now when *this*
device received it. **The only honest answer to "how long since I heard from them" is one this
phone can observe** — somebody else's clock is not evidence about our own silence.

**And the same fault in the overdue signal, which fixing the first one made incoherent.**
`until` is a claim in the sender's frame — *"back by nine"* means nine on the phone that said
it — and it was compared straight against our clock. A peer whose clock ran slow read as
**overdue the moment they set out**. `overdue` is a nudge to a buddy, and the anti-pattern
table names overdue nudges as the thing that produces alarm fatigue: a signal that fires
because somebody's clock is wrong is precisely the noise that teaches people to ignore the
real one. The skew is observable from the same message, so the deadline is now translated into
our frame with no extra round trip and nothing to configure.

**The public board had the pairing inbox's flaw, through a wider door.** Same unbounded
quadratic intake, but the region tag is *public* — that is what a board is for — so anybody
may publish a card into somebody else's area. Bounded at two hundred, and the screen says the
board is partial, because a list that silently stops looks like a complete list and somebody
searching for one particular operator would conclude they are not there. Entries already shown
still update, so a flood cannot freeze the board.

**Nothing found in two places, both already right:** out-of-order delivery is handled
explicitly for presence, cards and public presence, each with the reasoning written down; and
a peer's `area` and `callsign` are bounded at the point of read.

### Clocks, three passes running

2.X found the ladder stalling on a backwards NTP correction. This pass found freshness and
overdue both measured against a stranger's clock. **Every one of them was a place where one
machine's time was used as though it were everyone's** — and the fix each time was to be
explicit about whose clock a number belongs to. Worth carrying into the remaining passes: any
timestamp that crossed a device boundary deserves the question *whose clock is this?*

**Method note, third occurrence.** `npx tsc` and `npx vitest --root` bypass the npm scripts
that rebuild core, so both were type-checking and testing against a stale `dist/`. Use the
package scripts — `npm run check`, `npm test --prefix` — not the tools directly.

## 4.R — Milestone 4, robustness

**A `Distress` could be buried under routine traffic on the screen a watch reads when
somebody is hurt.** The board put every signal in one list sorted by arrival — `Distress`
coloured red and otherwise equal — so forty queries arriving first put it forty rows down,
and the list was unbounded. The watch address is handed to every operator, so the door is as
open as the escalation executor's.

**This one is a spec violation, not a design opinion.** `signals.spec.md` says `20911` is a
*"separate kind so clients and relays can prioritise it independently of routine traffic"*, and
`buildDistress` says it again in its own docstring: *"Distress gets its own kind so it is never
queued behind routine traffic."* Both halves of the protocol knew. The client flattened them
back together. **Red is not prioritisation if you have to scroll to find it.**

`Distress` now has its own section above everything, and the two lists are bounded separately
and deliberately differently:

- **Routine traffic is dropped when full.** Two hundred unanswered queries is already more
  than any watch will work through, and letting them accumulate costs the screen that matters
- **A `Distress` is never dropped to make room for routine traffic**, and has its own much
  higher cap. If even that is reached the board says so, because invariant 2 forbids failing
  silently — and a watch told that knows something extraordinary is happening, which is a true
  and useful thing to know

**Nothing found in one place, worth recording because it is the same question three passes
have now asked.** The board timestamps signals with **local receipt time**, not the sender's
`created_at`, so a backdated flood cannot reorder it. That is the "whose clock is this?"
question already answered correctly, in the component where getting it wrong would have been
worst.

### The harness, again

Two more gaps closed, both of which had made a whole milestone unreachable from a browser:
`seedDevice` can now seed a **watch key**, because the watch screen shows no board at all on a
device that does not hold one — so nothing about Milestone 4's main screen was testable end to
end. Between this and `relayEvents`, the board findings are proven where an operator would see
them rather than asserted through a mock.

## Milestone 2, after three passes

Every finding was in a path that only runs when something has already gone wrong, or when
nobody is watching: a flood, a failed dispatch, a dead executor, a drill nobody sees fire, an
ack at 3am, a clock correction at boot. **Milestone 2 is the milestone whose entire purpose is
to work on the worst night of somebody's year**, and three of the seven findings meant it
would not have.

The one that should carry forward: two of them — the unreachable ack path and the push
registration — passed every test because the tests exercised objects the product cannot build.
Coverage said yes and production said no.

## Milestone 1, after three passes

Every finding was in the same place — the moment an operator is alone and something has gone
wrong. A future date the display trusted, a `#` that ate the help message, a wipe that kept a
copy, a full phone that said nothing, a move that lost the record, a burn gate that would not
open, an overnight patrol that read as impossible. **Milestone 1 is the layer that has to work
when nothing else does**, and it was the failure paths, not the features, that had the holes.

## Method note, after three passes

Three passes on one milestone produced findings that compound: 0.R made the worker know what
it failed to cache, 0.E found nothing read it, 0.X found that a deploy silently discarded
what it had. Any one of these done as a single sweep would have stopped after the first.
