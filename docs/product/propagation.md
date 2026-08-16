# Propagation

How the network grows. This is a correctness concern, not a marketing one.

## Why it's load-bearing

Most of what makes NavCom worth using needs density that a single city can't provide:

- **Endorsements** only matter when you meet operators you don't already know
- **Presence** is compelling with fifty operators and demoralising with three
- **Portable standing** is meaningless in a network of one city
- **Collective knowledge** is only as good as the number of people keeping it current

A design that can't spread doesn't produce a smaller version of
[the vision](../vision.md) — it produces none of it. Density is a precondition, not a
milestone.

There's also a structural constraint: the project's maintainer is a support operator,
not a field operator, and cannot personally seed twenty cities. **The app has to spread
without its author or it stays a one-city tool.**

## The discipline: honest propagation

Same rule as honest retention. Growth mechanics that manufacture pressure are
disqualifying here — reward-driven recruiting would attract exactly the glory-seeking
personality this community is wary of, and it would poison the endorsement layer
immediately.

**Propagation follows the community's existing trust paths rather than bypassing them.**
Trust here is built in person and through known reputation. The mechanics ride those
rails or they don't exist.

---

## Mechanisms

### 1. Endorsement as invitation — primary

Endorsing an operator who isn't on NavCom yet produces a **claimable credential**. They
receive something that says: someone you worked beside vouched for you, and it's waiting.

This makes the standing system its own distribution channel, and it grows the network
strictly along real working relationships. It is earned rather than solicited — nobody
is asked to recruit anyone.

Design requirements:

- The endorsement is a signed attestation that exists whether or not it's ever claimed
- Claiming it requires only generating a persona — no account, no verification step
- Unclaimed endorsements expire, so nothing accumulates indefinitely against someone who
  isn't interested
- **One endorsement, one delivery.** No reminders, no follow-ups, no second notice.
  Declining is silent and permanent

### 2. The artifact that leaves — primary

A scrubbed, well-made recap of an operator's own op, designed to be posted publicly.

This is a convergence: the same feature that stops the Public Face from screenshotting
something with a teammate's callsign in it *is* the thing that makes the project visible
outside its own users. Give him something built to travel and he stops improvising.

Design requirements:

- Contains only the sharing operator's own activity — never teammates' callsigns,
  positions, or presence
- Coarse location at best; no route, no timing detail
- Carries a quiet mark of provenance. No call to action, no download link, no referral code
- Generated on request, never automatically

### 3. Export to Herocore

Op logs export in a form the community's existing hub accepts. Every exported log lands
where the entire community already reads, which is propagation through the incumbent
rather than against it.

### 4. In-person QR join

Joining a team or an op by scanning a code, face to face. Unspammable by construction,
and it mirrors how trust is actually established here.

### 5. Travel

Operators moving between cities carry the app along real social ties and seed it where
they land. Supported by making cross-city presence and portable standing work well — the
propagation is a side effect of the features being good.

### 6. The directory as a public good

Resource data readable on the open web without installing anything.

Outreach workers, street medics and mutual aid groups find it useful on its own terms;
some become operators. It also makes the project legible to people who would never
install something described as a superhero app.

---

## Cold start

Mechanisms bring people. They don't bring data — and the first operator in a new city
opening an empty directory is the failure that ends adoption there.

**Any metro seeds automatically from public and open sources**, marked low confidence,
and community correction upgrades it from there. This is honest because the schema
already encodes `method: website` as low confidence and displays it as such.

The first operator in a city should find a thin, clearly-imperfect, obviously-useful
starting point — never a blank screen.

---

## Anti-patterns

Never built, regardless of effectiveness:

- Referral rewards, invite quotas, or unlocks in exchange for recruiting
- Contact list upload or address book matching
- "X people in your area" pressure messaging
- Public growth metrics or operator leaderboards
- Reminders to claim an endorsement
- Anything that makes an operator's standing depend on how many people they brought in

## Open questions

- **Is an unclaimed endorsement welcome?** Reaching someone outside the app with "you've
  been vouched for" could read as recognition or as being volunteered for something.
  This needs a real answer from operators before it ships.
- **What carries the claimable credential?** Any delivery channel implies contact details
  the app deliberately doesn't hold. Likely resolution: the endorser passes it along
  themselves, in whatever way they already talk to that person — which keeps the app out
  of the contact business entirely.
- **Seeding quality by region.** Public data varies enormously between metros. Some
  cities will seed well and some barely at all.
