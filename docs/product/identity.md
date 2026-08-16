# Identity & Standing

Identity is the center of NavCom, not a settings screen. It's what makes the app the
operator's rather than the org's.

---

## Persona

What exists:

| | |
|---|---|
| **Callsign** | The name they work under |
| **Emblem** | Their mark |
| **City / region** | Coarse by default — metro, not neighbourhood |
| **Active since** | The date they started |
| **Focus** | Outreach, medic, patrol, logistics, support — multiple allowed |

What does not exist, anywhere in the system: legal name, phone number, email address,
date of birth, home location, employer, photograph of the operator's face unless they
deliberately upload one as their emblem.

There is no account. The keypair generated on the device **is** the identity. Nothing is
registered with anyone; nothing can be revoked by anyone.

## Standing accrues on two independent axes

This matters, and it's the part most vouching systems get wrong.

### Axis 1 — Endorsements

Signed statements from operators who have worked beside you. "Worked an op with this
operator, would again." Optionally scoped — *medic*, *de-escalation*, *reliable in a
crisis*.

### Axis 2 — Contribution

Directory corrections, playbook additions, answered questions — credited to the
callsign that made them.

**Why two axes:** an operator with deep lived experience and no social history can build
real, visible standing through contribution alone, without waiting for anyone's
permission. A single-axis reputation system ranks that person as untrusted, which is
exactly backwards — they often know more than anyone endorsing them. Contribution
requires nobody's approval, and it shows.

## Endorsements are held, not indexed

**The recipient holds their own endorsements and presents them.** They are signed
attestations stored on the endorsee's device, like references in a wallet — not rows in
a table somewhere.

Consequences:

- **No central social graph exists.** Nobody, including us, can query "who knows whom"
  across the network. There is no map of pseudonymous operators' associations to breach,
  sell, subpoena or leak.
- **Verification is local and offline.** You show your endorsements; my device verifies
  the signatures against the endorsing callsigns. Works with no signal.
- **Revocation is possible** — endorsers can publish a revocation, checked when online.
- **You choose what to present.** Show everything, or only what's relevant to this op.

The trade: no global leaderboard, no discovery-by-reputation. That's an acceptable loss.
The graph was the single most dangerous artifact the project could have created, and it
was never the point.

## What this is not

**It is not a security system, and must not be described as one.** It's a social signal
that raises the cost of showing up as a stranger with no history — nothing more.

Honest limits:

- **Sybil-resistant only weakly.** Anyone can generate keys. Endorsements from unknown
  callsigns mean little; the value is in recognising the *endorsers*.
- **Endorsements can be traded or given carelessly.** Some operators will endorse
  generously for social reasons. Treat volume as noise and provenance as signal.
- **Absence of standing means nothing.** New and private operators are legitimate. The
  UI must never present an unendorsed operator as suspect — only as unknown.

## Recovery

A lost or seized phone must not erase years of standing.

- Identity and endorsements export as an encrypted operator-held backup — a file or a
  printed recovery code, kept wherever the operator chooses
- No server-side recovery, because that would require an account, which would require
  identifying information
- The tradeoff is stated plainly at persona creation: **no backup means no recovery**

## Panic wipe and identity

Panic wipe destroys the [Wipeable tier](./data-tiers.md) — tonight's data. It does not
destroy identity, because an operator under duress should lose the evening and keep the
decade.

A separate, deliberate **burn** action exists for destroying the persona itself. It's
harder to reach, and it warns clearly, because it is irreversible.
