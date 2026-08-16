# Feature Validation

Sixteen candidate features run against [the twelve archetypes](./archetypes.md), then
run backwards for uninstall triggers.

**✅** uses it as designed · **⚠️** survives only with a specific constraint ·
**❌** refuses it, is harmed by it, or gets nothing

---

## The run

| # | Feature | ✅ | ⚠️ | ❌ | Note |
|---|---|---|---|---|---|
| 1 | Resource directory (read) | 12 | 0 | 0 | Only unanimous feature in the set |
| 2 | Resource directory (contribute) | 8 | 3 | 1 | Requires anonymous, unlinkable writes |
| 3 | Field reference / knowledge base | 9 | 3 | 0 | Outpost benefits most — no trainer within 2 hours |
| 4 | Incident documentation (self) | 8 | 4 | 0 | Local, private, offline, no network |
| 5 | Panic wipe | 10 | 2 | 0 | Cheap; required by the most at-risk |
| 6 | Duress alert | 9 | 2 | 1 | Outpost breaks it — needs SMS fallback |
| 7 | Patrol logs (auto) | 6 | 5 | 1 | Local-only, exportable, deletable, never auto-uploaded |
| 8 | Hero card / persona identity | 7 | 5 | 0 | Local artifact only — fails as a hosted profile |
| 9 | Check-in / buddy timer | 5 | 5 | 2 | Structurally broken by the Heart |
| 10 | Op board / scheduling | 7 | 3 | 2 | Discord already does it |
| 11 | Supply / inventory | 4 | 4 | 4 | Single power user |
| 12 | Cross-city / travel | 5 | 3 | 4 | Depends on presence, which fails |
| 13 | Ambient presence | 4 | 4 | 4 | *Actively harms* two archetypes |
| 14 | Live position map | 4 | 3 | 5 | Highest cost, worst reception |
| 15 | Vouching / trust graph | 5 | 3 | 4 | Fails on the people it most needs |
| 16 | Team chat | 2 | 4 | 6 | Redundant with Discord and Signal |

## Notable failures

**Ambient presence (13)** — Worse than it first appears. It doesn't merely fail to serve
the Skeptic, Protest Medic and Ghost; it *harms* the Outpost, who sees an empty map that
says "you are alone," and the Heart, who sees everyone active during her down cycle and
feels guilt. **A campfire with nobody around it is worse than no campfire.**

**Live position map (14)** — Most expensive feature to build, five hard refusals, and the
Public Face will screenshot it and leak a teammate's callsign and position to social
media.

**Vouching (15)** — Fails in the worst direction. The Convert, the most valuable
contributor, ranks untrusted because lived experience leaves no digital trail. The Public
Face vouches carelessly for clout, poisoning the signal. And the resulting graph is a
standing liability (see [README](./README.md), finding 2).

**Check-in (9)** — Has a safety-critical bug in its *semantics*, not its code. False
alarms cause alarm fatigue; alarm fatigue kills the one feature where failure means
someone is actually hurt. If built: missed check-in must mean **nudge the team**, never
**emergency**, and duress must always be a deliberate act, never inferred from silence.

---

## Uninstall analysis

Run backwards on the survivors — what makes each archetype delete it?

| Archetype | Kill trigger |
|---|---|
| Convert | Footprint (OS prompts deletion), background cellular data, any identity request |
| Team Lead | Mental-model mismatch — expected a team tool. Quiet death, wide blast radius |
| Quartermaster | His use case wasn't built |
| Connector | No social loop, no habit hook |
| Heart | Guilt, re-entry friction, "you haven't patrolled in 60 days" |
| Public Face | No shareable artifact, no publicity surface |
| **Medic** | **One accuracy failure with consequences — and she tells everyone** |
| Skeptic | Any undisclosed network call, analytics SDK, or unexpected permission |
| Protest Medic | Panic wipe that leaves recoverable data; app icon that names affiliation on a seized phone |
| Trainer | Reference content below his expertise |
| Ghost | A single nudge toward profiles, teams, or location |
| **Outpost** | **Cold-start emptiness — nothing listed for her county** |

### The five categories, ranked by severity

1. **Accuracy failure with consequences** — attacks the core value proposition *and*
   travels by word of mouth.
2. **Cold-start emptiness** — a directory with no local data is worse than nothing.
3. **Trust betrayal** — one strike, and it spreads.
4. **Resource cost** — storage, data, battery.
5. **Nagging and guilt** — every standard engagement tactic is a deletion event here.

---

## What survives

### Tier A — build
- Resource directory (read + anonymous contribute)
- Field reference
- Incident documentation
- Panic wipe
- Duress with SMS fallback

### Tier B — build carefully, later
- Patrol logs — local-only
- Hero card — local artifact
- Check-in — redesigned as a nudge

### Tier C — cut
- Live position map
- Vouching graph
- Ambient presence
- Team chat
- Op board
- Inventory

---

## Consequences for the stack

Tier A contains **no communications features at all**. It is a field reference and
personal safety kit. That result retired two earlier requirements outright:

- **Post-quantum crypto** — Tier A holds no interpersonal secrets worth protecting. The
  realistic threat is doxxing and harassment, so *pseudonymity* is the security product,
  not cipher strength.
- **Decentralization** — matters less than **local-first**, which is simpler and
  stronger. No backend means no honeypot.

And two requirements were promoted:

- **Offline** — from aspiration to hard requirement (Outpost, Convert, Protest Medic).
- **Small** — the device floor is a prepaid Android 8 with 400MB free. This likely rules
  out bundled vector basemaps and heavy map rendering in v1; addresses that hand off to
  the phone's existing maps app cost almost nothing.

Which lands the architecture at a **PWA with no backend**: a signed data file behind a
CDN, a service worker, and local storage. No app store, no review cycle, no FCM/APNS
metadata trail, one codebase for web and mobile.
