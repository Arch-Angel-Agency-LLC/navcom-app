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
| **1** One operator alone | Display rules, patrol record, contact, wipe, seeder | — | — | — |
| **2** One watch staffed | Executor, pager, drills, web push, on-call | — | — | — |
| **3** Two who met once | Peers, presence, cards, invites, public presence, buddy | — | — | — |
| **4** Squad with no box | Watch mode, group sealing, board, handover, watch key | — | — | — |
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

## Method note, after three passes

Three passes on one milestone produced findings that compound: 0.R made the worker know what
it failed to cache, 0.E found nothing read it, 0.X found that a deploy silently discarded
what it had. Any one of these done as a single sweep would have stopped after the first.
