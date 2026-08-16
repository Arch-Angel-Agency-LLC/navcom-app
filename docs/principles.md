# Principles

Design rules, and how conflicts get resolved. When a decision is contested, it gets
settled here rather than by whoever argues longest.

---

## 1. Opt-in, not absent

Operators disagree fundamentally about visibility. Some share position freely; others
will never share anything and still deserve a full app.

**The resolution is always a visibility setting, never a deletion.** A feature that some
operators refuse is a feature with an off switch — not a feature that nobody gets.
Removing it serves only the person who refused; making it optional serves everyone.

Defaults lean private. Ceilings stay high.

## 2. Two kinds of memory, opposite rules

The single most important architectural distinction in the app. See
[`product/data-tiers.md`](./product/data-tiers.md).

- **Things that should last:** persona, standing, endorsements, contributions, op
  history. These accrue. Losing them is the failure.
- **Things that must vanish:** live positions, incident logs, anything about tonight.
  These are wipeable on command. Retaining them is the failure.

Applying one rule to both produces either a tool that can't build anything or a tool
that's dangerous to carry.

## 3. Honest retention

The app earns opens by **reflecting something real**: the network is active, your team
is out, someone answered your question, a listing near you changed.

It never manufactures urgency. No streaks, no badges, no leaderboards, no "you haven't
patrolled in 60 days," no engagement notifications. Beyond being unpleasant, competitive
mechanics would attract exactly the personality this community is wary of.

There is a wide space between nagging and giving nobody a reason to return. Live in it.

## 4. Never the people served

No names, no descriptions, no photographs, no locations of individuals, no medical
details, no counts tied to identifiable people.

This app describes **services and operators**. Never recipients. There is no field for
it, no free-text convention for it, and no feature that would need it.

This is not configurable and does not have a use case that overrides it.

## 5. Pseudonymity is architectural

The realistic threat is doxxing, stalking and harassment — not state-grade cryptanalysis.
Security effort goes into **not holding identifying data in the first place**:

- No legal names, phone numbers or email addresses
- Keys generated and held on device
- No central social graph — standing is self-held and presented (see
  [`product/identity.md`](./product/identity.md))
- No push notification services that reveal recipients to third parties
- Nothing on a server worth seizing

Encryption protects op traffic and duress alerts. It is not a substitute for having
nothing to leak.

## 6. An honest blank beats a confident guess

The worst failure available to this app is a confident wrong answer that sends someone
somewhere that turns them away at 10pm.

- Volatile data always displays its age
- Stale volatile data displays as "call first," never as its old value
- Blank renders as "unknown," never as "no restriction"
- Flagging something as wrong is always easier than fixing it

## 7. The device floor

**A prepaid Android 8 with ~400MB free.** Some of the most valuable operators are the
ones with the least device. If it doesn't run there, it doesn't ship.

Practical consequences: small install, no heavy bundled basemaps, no background data on
cellular without consent, battery treated as a first-class budget.

## 8. Complement, don't replace

Teams already use Discord and Signal, and those work. Herocore already hosts patrol logs
and community presence. NavCom does what those structurally cannot — live operational
awareness, position, duress, accruing standing, field-current knowledge — and exports to
them rather than competing.

## 9. Offline is a normal state

Not an error condition. Rural operators, dead zones, basements, dying batteries. The
knowledge layer is fully usable with no signal; anything requiring the network degrades
visibly rather than failing silently.

---

## Resolving conflicts

When two principles collide, this is the order:

1. **Never the people served** (4) — absolute, overrides everything
2. **Operator safety** — duress, wipe, pseudonymity (5)
3. **Accuracy** (6) — better to say "unknown" than to be wrong
4. **Opt-in** (1) — before removing anything, try making it optional
5. Everything else
