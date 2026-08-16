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

Signed statements from operators who have worked beside you, carrying a **scope tag** —
never free text.

`worked with` · `reliable` · `de-escalation` · `medic` · `logistics` ·
`trained with me` · `can take watch`

`can take watch` is the qualification for holding the board — granted by operators who
have worked with you, using the standing model rather than introducing a rank. See
[`../watch/the-watch.md`](../watch/the-watch.md).

Free text is prohibited deliberately. An endorser explaining *why* someone is credible
is how an operator's history leaks — the person with the most valuable knowledge is
often the one with the most to lose from it being described.

`trained with me` matters more than it looks: it's the cleanest route to first standing
for a newcomer who has nothing yet.

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
- **Provenance is shown by name; never a count.** The UI surfaces *which* operators
  endorsed, prominently — never a score, total, or aggregate. You trust someone because
  you recognise who vouched for them. A number invites gaming and turns a generous
  endorser's volume into noise; a name makes that volume self-evidently weak signal.
- **Revocation is possible** — endorsers can publish a revocation, checked when online.
- **You choose what to present.** Show everything, or only what's relevant to this op.

The trade: no global leaderboard, no discovery-by-reputation. That's an acceptable loss.
The graph was the single most dangerous artifact the project could have created, and it
was never the point.

## Endorsing someone who isn't here yet

You can endorse an operator who doesn't use NavCom. The attestation is signed and exists
regardless; it becomes a **claimable credential** they can take up or ignore.

This is also how the network grows — along real working relationships rather than
recruitment. See [`propagation.md`](./propagation.md).

**The credential names no one but the endorser.** It reads *"I vouch for the holder of
this credential,"* carries a scope tag and a date, and binds to whatever persona claims
it. An endorser can never create a record naming a person who hasn't agreed to exist in
the system — which resolves the consent problem at its root rather than managing it.

- **Inspectable offline before claiming.** The recipient reads exactly what it contains
  and verifies the signature with zero network activity. Nothing phones home before they
  consent
- Claiming requires only generating a persona — no account, no verification, no approval
- **Recognition, not recruitment.** Past tense: someone you worked with vouched for you.
  Never an invitation to join anything
- **One delivery, no reminders, no expiry.** Nothing is accumulating anywhere, because
  the system never holds or delivers it. A countdown would only manufacture pressure
- **The endorser cannot see whether it was claimed.** Declining is silent and permanent
- The endorser passes it along however they already talk to that person. The app holds no
  contact details, so it cannot deliver anything itself

## What this is not

**It is not a security system, and must not be described as one.** It's a social signal
that raises the cost of showing up as a stranger with no history — nothing more.

Honest limits:

- **Sybil-resistant only weakly.** Anyone can generate keys. Endorsements from unknown
  callsigns mean little; the value is in recognising the *endorsers*.
- **Endorsements can be traded or given carelessly.** Some operators will endorse
  generously for social reasons. Treat volume as noise and provenance as signal.
- **Absence of standing means nothing.** New and private operators are legitimate. The
  UI must never present an unendorsed operator as suspect — only as unknown. An operator
  running Ghost is unendorsed by choice.

**Where infiltration is the actual threat — protest support, hostile environments — the
answer is out-of-band verification, not this app.** Say so plainly rather than letting a
credential carry weight it can't hold. Standing raises the cost of showing up as a
stranger; it does not establish that someone is safe.

## Recovery

A lost or seized phone must not erase years of standing.

- Identity and endorsements export as an encrypted operator-held backup — a file or a
  printed recovery code, kept wherever the operator chooses
- No server-side recovery, because that would require an account, which would require
  identifying information
- The tradeoff is stated plainly at persona creation: **no backup means no recovery**

## Panic wipe, burn, and what endorsements expose

Panic wipe destroys the [Wipeable tier](./data-tiers.md) — tonight's data. It does not
destroy identity, because an operator under duress should lose the evening and keep the
decade.

**But endorsements are association data.** Each one names the operator who signed it, so
a collection of them maps who has worked with whom. That's the artifact we refused to
build centrally, and it can't be avoided locally — verification requires knowing the
endorser.

The threat models are different, and the two actions match them:

| | Protects against | Destroys |
|---|---|---|
| **Panic wipe** | A taken phone being searched | Wipeable tier only. Identity and standing survive |
| **Burn** | Compulsion, seizure with intent | Everything, including persona and endorsements |

Endorsements are **encrypted at rest and require unlock to view**, so a casually searched
phone yields nothing readable. Burn is deliberate, harder to reach, clearly warned, and
irreversible.

Say this plainly to operators rather than implying panic wipe is total. An operator who
believes they're covered when they aren't is worse off than one who knows the boundary.
