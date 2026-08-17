# What Fiction Skips

[`lore.md`](lore.md) explains what the watch model took from fiction. This document is
about the opposite: **the problems fiction never had to solve, because a story can cut
away from them.**

That's where original product lives. A mechanic copied from a story is a mechanic some
other product can copy too. A mechanic invented because real operators hit a problem no
story has is, by construction, not a reskin.

> **Not scope.** Current scope is the sign-on → `Query` → answer loop and nothing else
> ([`CLAUDE.md`](../../CLAUDE.md)). This is research feeding later design. Nothing here is
> committed to, and several entries collide with rules that would win.

## The test

A candidate passes if **it could not have been copied from another product, because
nothing else has the problem.** Two failure modes to watch:

- *Solved elsewhere* — if Discord, PagerDuty or a safety app already does it, we're
  reskinning
- *Solved by removal* — if the honest answer is "don't build anything," that's a real
  result and it belongs here too

---

## 1. Coming home and being counted

**Fiction cuts away.** The hero wins and the scene ends. Nobody watches them get home.

**Real operators end every single patrol this way**, and the ending is the part that
carries weight. `Stood down` already exists as a signal, and the watch confirms it — but
the docs treat it as bookkeeping (an entry clears from the board) when it is arguably the
most emotionally load-bearing moment in the product.

→ **Candidate:** stand-down is a *closing exchange*, not a status update. The watch
confirms by name, and the operator's record shows the night closed cleanly. Cost is close
to zero; the difference between "entry removed" and "Raven confirmed you're home" is
entirely in the wording.

⚠️ Collides with nothing. This may be the highest value-per-byte item in the document.

## 2. Burnout, and coming back

**Fiction has no vocabulary for this.** Heroes retire dramatically or die. No story shows
someone going hard for six weeks, disappearing for three months, and quietly returning.

**That is the single most common real pattern**, and [the Heart](archetypes.md) exists to
represent it. [C5](constraints.md) already bans streaks, badges and absence commentary,
which handles the *harm*. Nothing handles the *return*.

→ **Candidate:** re-entry is silent and complete. No "welcome back," no summary of what
was missed, no implication that time passed. The board on your first night back looks
exactly like the board on any other night.

⚠️ The temptation will be a gentle re-onboarding. That is a nudge, and nudges are
deletion events for this population.

## 3. Declining the call

**Fiction's heroes always answer.** Refusing is a character arc, and it's always a failure
to be redeemed.

**Real volunteers are tired, sick, working tomorrow, or already out.** `Assist` currently
has one honest failure — it goes unanswered and that's reported. There is no way to
*decline*, which means the only ways to not help are silence or guilt.

→ **Candidate:** an explicit "not tonight" response to `Assist`, visible to the watch as a
resolved non-answer rather than a gap. Declining is a legitimate operational state and
saying so out loud is cheaper than letting silence carry the meaning.

⚠️ Must never accumulate. A count of declines is a compliance metric, and
[C5](constraints.md) kills it.

## 4. The ninety-five percent where nothing happens

**Fiction is made of the five percent.** Every scene is the night something happened.

**Most patrols are uneventful, and most console shifts are quiet.** [console.md](../watch/console.md)
already says the board "is mostly calm" and that when nothing is happening "it says so
quietly" — which is the right instinct and is currently one sentence.

The real design question is unanswered: **what makes an empty night feel like service
rather than failure?** Every conventional answer is banned here — no activity feed, no
streaks, no "you covered 4 hours!" Those are exactly the mechanics that would make it
worse.

→ **Candidate:** the quiet night *is* the deliverable, and the interface should say so
without congratulating anyone. "Nothing happened. Three operators got home." That's a
report, not a celebration, and it's true.

⚠️ This is the hardest one in the document and the most likely to be solved badly. It is
also where an app that respects its users separates from one that doesn't.

## 5. Being wrong administratively

**Fiction's heroes are wrong dramatically** — the wrong suspect, the trap, the betrayal.
Never wrong on paperwork.

**Real watch failure is administrative**: an overdue that passed without contact, a query
answered from a stale record, a handover that dropped someone. The
[accountability log](../spec/watch-state.spec.md) already records actions *and inaction*,
which is unusually good.

→ **Candidate:** nothing new to build — but the framing should be explicit somewhere
operator-facing. The watch will get things wrong, the log will show it, and that is the
system working rather than the system failing.

⚠️ Do not turn this into performance review. The log exists so operators can check the
watch, not so the watch can be scored.

## 6. Who watches the watcher

**Fiction never asks.** Oracle is trustworthy because she's Oracle.

**This is already the best-developed answer in the repo** — the
[Hostile Watch](ecosystem-roster.md), `can take watch` as an endorsement scope, reviewable
actions, and the right to decline to sign on under a specific watch silently. Listed here
because it is the clearest existing example of the pattern this document is hunting:
fiction assumed it away, and taking it seriously produced original design.

## 7. Someone is actually hurt

**Fiction's aftermath is a hospital scene and a speech.**

**Real aftermath is a person who was on station when it happened.** The escalation ladder
is fully specified up to `ACKNOWLEDGED` — and then the documents stop. Failure mode 3 in
[`escalation.spec.md`](../spec/escalation.spec.md) already admits this: *"acknowledged then
nothing happens → ladder stopped; known limitation, documented."*

→ **Candidate:** the honest minimum is that the system knows an incident closed and stops
pretending it's still operational. Anything beyond that is human work.

⚠️ **Hard boundary.** Any actual guidance here is [playbook content, which agents must not
generate](../../CLAUDE.md) — the Medic's kill trigger is confident wrong guidance, and
this is the highest-stakes possible place for it. Whatever ships here is written by people
with real expertise or it doesn't ship.

## 8. Money, and who is carrying it

**Fiction's heroes are billionaires or the funding is invisible.**

**Real operators buy supplies out of pocket**, and the person doing the most is often the
one who can least afford it. [funding.md](../product/funding.md) solves *pseudonymous
receipt*, which is the hard technical half. The unsolved half is that the app deliberately
shows no totals, so nobody can see who is carrying the cost — which is correct
([C16](constraints.md)) and leaves a real problem unaddressed.

→ **Candidate:** the team supply fund already noted in funding.md is probably the whole
answer — crew-level rather than individual sidesteps the incentive problem entirely.
Worth promoting from a footnote.

## 9. The first night

**Fiction's origin story is dramatic and instantaneous.**

**A real first patrol is frightening and mostly consists of not knowing what you're
doing.** [propagation.md](../product/propagation.md) has a verification task for the first
*contribution*; nothing addresses the first *shift*.

→ **Candidate:** the honest answer may be that this is not a software problem. The Trainer
exists in [the twelve](archetypes.md), `trained with me` is already an endorsement scope,
and a person is a better answer than an onboarding flow.

⚠️ Anything engaging here is banned outright. Onboarding must not be made fun.

## 10. When the person who knew everything leaves

**Fiction's mentors die and their knowledge passes by inheritance or flashback.**

**Real networks lose the operator who knew every intake rule**, and the knowledge simply
goes. The two-axis standing model means their *contribution* is credited and their
knowledge is already in the [directory](../product/directory-schema.md) — which is a
genuinely good structural answer that nobody designed on purpose.

→ **Candidate:** make it deliberate. The directory is the succession mechanism, and that
is an argument for contribution that no engagement mechanic could ever make: *what you
write down outlives your involvement.*

---

## Which of these are actually worth building

Ranked by value against cost, and honest about which are not software problems.

| | Item | Verdict |
|---|---|---|
| 1 | Coming home and being counted | **Build.** Nearly free, and it's the emotional close of every session |
| 2 | Declining an `Assist` | **Build.** Small, removes guilt from a legitimate state |
| 3 | The quiet night | **Design carefully.** Hardest problem here, and the most differentiating |
| 4 | Silent re-entry | **Build as a prohibition**, not a feature — write it into the rules |
| 5 | Team supply fund | **Promote** from a footnote in funding.md |
| 6 | Directory as succession | **Reframe.** Costs nothing, strengthens the contribution argument |
| 7 | Administrative wrongness | **Reframe.** Existing mechanism, missing narrative |
| 8 | Incident aftermath | **Human work.** Specify the boundary; don't generate the content |
| 9 | The first night | **Probably not software.** A person beats a flow |
| 10 | Who watches the watcher | **Already done.** Kept as the worked example |

## The pattern underneath

Seven of the ten resolve to **saying a true thing plainly, at the right moment** — not to
a feature. Stand-down confirmed by name. Declining as a legitimate answer. A quiet night
reported rather than celebrated. Re-entry with nothing said at all.

That is consistent with a product whose strongest rules are all prohibitions, and it
suggests the not-a-reskin quality lives in **register** as much as in mechanics. Every
comparable product would solve these with engagement surface. The differentiated move is
to solve them with one accurate sentence and no interface at all.
