# The Ecosystem

NavCom is one of two applications. This defines the other, what passes between them, and
what must not.

Lineage is in [`lineage.md`](lineage.md). The object both are built from is in
[`attestation.md`](attestation.md).

---

## Two altitudes of one idea

Both serve **the operator who isn't in the field** — the guy in the chair. That archetype is
NavCom's central innovation at local scale and Starcom's entire premise at global scale.

| | **Starcom** | **NavCom** |
|---|---|---|
| Altitude | Global, transnational | Local, one city, one night |
| Answers | *What is happening on Earth* | *Who has my back tonight* |
| Horizon | Campaigns, patterns, networks | Minutes to hours |
| Failure mode | Being wrong about the world | Someone alone when they needed not to be |
| Scales by | Adding analysts | Adding someone awake |
| In one word | Knowing | Being with |

**You navigate by the stars.** Starcom is the fixed reference frame; NavCom is crossing real
terrain using it.

Starcom is a 3D global cyber command interface for cyber investigations and strategic
intelligence — decentralised, open source. It refines raw intel into **Intel Reports**, and
those into **Mission Packages**. Its operators appear in NavCom's roster as
[the Investigator and the Cartographer](research/ecosystem-roster.md).

## The Earth Intelligence Network

Not "two apps that share data." **A network where every claim carries its own evidence of
how much to trust it.**

The idea inherited from Steele is the **eight tribes** — intelligence fails from structural
non-sharing between groups that each hold a real piece, not from insufficient collection.
His actual phrase is information-sharing *and sense-making*: two acts, and almost everyone
builds only the first. The tribes exchange conclusions stripped of their evidence chain,
which is why the exchange doesn't compound.

[An attestation](attestation.md) is the technical answer to that, and it is what both
applications already are.

**NavCom's contribution is the ninth tribe** — and it is sharper than "people with local
ground truth." It is **people who act without institutional authority and must therefore
carry their own provenance.** Institutions are believed for what they are. The ninth tribe
is believed for what it can show.

Starcom refines what is publicly knowable. NavCom holds what is only knowable by being
present.

---

## The convergence

Starcom's `Finding` carries a claim, a confidence, corroboration with a source count and an
algorithm version, and a signature. NavCom's directory record carries a claim, a method, an
age, a derived confidence, and an author.

**Two teams, no shared code, the same object.** That is the strongest available evidence
that the primitive is real rather than an aesthetic — and it changes what integration is.
This is not a negotiation between two schemas. It is **one object, aimed at different
subjects**, and the work is recognising that rather than translating.

Practical consequences:

- Vocabulary converges on Starcom's where it already exists. `claim` is the payload;
  attestation is the signed whole
- A Mission Package handed to NavCom is an attestation about a situation, weighed like any
  other — not a directive
- NavCom answering `Query` from directory data attaches provenance, which is the same field
  Starcom's Finding already carries

## The handoffs

Two objects cross, in opposite directions.

```
   STARCOM   raw intel → Intel Report → Mission Package
      │  ▲
      │  │ patterns, aggregated and de-identified   (outbound)
      ▼  │
   NAVCOM   Console (watch)  ·  Field Terminal
```

**Outbound** is specified: [C35](research/constraints.md) — field data crosses as patterns,
never as operator records. An operator may contribute one incident to a case without
surrendering their [log](product/data-tiers.md).

**Inbound** is the harder direction, and three existing rules shape it before its contents
are known:

1. **It must not become a feed.** An inbox that accumulates is a feed with a military
   haircut, and [principle 2](principles.md) does more anti-drift work than every other rule
2. **It is the most likely vector to break invariant 1.** OSINT-derived material is very
   likely to describe individuals
3. **It has no home on the Field Terminal.** Five screens, one hand, dark, cold

### Where a Mission Package lands

**The Console, and only the Console. It reaches the field as a `Query` answer or an
`Assist`, or it doesn't reach the field.**

No new primitive: the watch is *already* the human filter between a large knowledge layer
and someone standing in the cold. A package is another thing the watch knows.

- No Mission Package UI on the Field Terminal, ever
- No notification to any operator about one
- It becomes [directory or playbook entries](product/directory-schema.md) if it is durable,
  or it expires with the board if it is current. Never a fourth tier
- Passing it on is a logged watch action like any other

### The valve

| Direction | May cross | Must never cross |
|---|---|---|
| **NavCom → Starcom** | Aggregated patterns, de-identified; single incidents contributed deliberately | Operator records, callsigns, positions, board state, query text, endorsements |
| **Starcom → NavCom** | Situational context for the watch; durable knowledge | Anything identifying a person being served. Anything arriving as a feed. Anything reaching the Field Terminal directly |

**Filtering happens on arrival, on NavCom's side, regardless of what the sender believes it
removed.** Starcom states its own residual gap — redaction masks emails and numbers, not
names — and an upstream redactor that documents its own incompleteness cannot be the
enforcement point for invariant 1. *Stated as a requirement; no ingestion exists yet.*

## What NavCom must never inherit

- **Clearance and compartmentation.** [lore.md](research/lore.md) already refused these from
  the fiction, and an intelligence platform is exactly where they re-enter. NavCom accepts
  `classification: UNCLASSIFIED` only — a volunteer network has no business holding more,
  and taking the field while ignoring it would leave a rank system half-built
- **Global scope meeting a local privacy rule.** Starcom's job is knowing things about the
  world. NavCom's job includes *not* knowing things about people
- **The analyst's confidence register.** An Intel Report is written to be acted on. A NavCom
  answer at 10pm shows its age and says "call first" when it doesn't know
- **Cloud anything.** [C26](research/constraints.md) — local inference only

## Open

- **What a Mission Package contains.** Everything above constrains its shape without knowing
  its payload, deliberately
- **Broadcast versus addressed.** Today's implementation is plaintext broadcast, which makes
  Console-only a convention rather than a boundary. If it becomes addressed, the Watchtower
  pubkey is handed over out of band by a person — [`bootstrap.spec.md`](spec/bootstrap.spec.md)
  forbids a discovery endpoint, because a list of Watchtowers is a list of where operators are
- **`entityRef` in a public tag.** A Finding's `d` tag exposes it unencrypted. Location-only
  today, but `attribute` is deliberately open-ended
- **Key rotation.** Neither project has a story. A shared Mk1 problem, not an asymmetry
