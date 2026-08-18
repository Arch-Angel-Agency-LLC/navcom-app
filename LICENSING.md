# Licensing

Three licences, because three different things live here and they have genuinely different
reuse profiles. Conflating them is the usual mistake.

| What | Where | Licence | |
|---|---|---|---|
| **Code** | `web/`, tooling | **Apache-2.0** | [`LICENSE`](LICENSE) |
| **Directory data** | `data/` | **CC0 1.0** | [`data/LICENSE`](data/LICENSE) |
| **Documentation** | `docs/` | **CC BY 4.0** | [`docs/LICENSE`](docs/LICENSE) |

## Why each one

**Code — Apache-2.0.** A patent grant, and an explicit *non*-grant of trademark. The second
matters more than usual here. "NavCom" carries a promise about behaviour — that `Distress`
ends in a human or reports that it couldn't, that the directory shows its age rather than
guessing. Apache section 6 means you can fork the code and cannot take the name with it. A
careless fork trading on that name is a real hazard when the name is the safety claim.

**Directory data — CC0 1.0.** The directory is a public good or it isn't. A city, a 211
service, a mutual aid group or a street medic should be able to use corrected data with
zero friction and no lawyer. Anything less permissive — including NonCommercial, which
sounds protective — would block exactly the reuse
[`docs/product/propagation.md`](docs/product/propagation.md) names as a growth mechanism.

CC0 is also the honest choice about what is being claimed. Facts about a shelter's opening
hours may not be copyrightable at all in many jurisdictions, and asserting a right that may
not exist would be its own small overclaim.

**Contribution credit survives this.** CC0 does not stop NavCom crediting the callsign in
`verified_by`, and [`docs/product/identity.md`](docs/product/identity.md) makes contribution
one of the two axes of standing. What CC0 gives up is *legally compelling* downstream
reusers to carry that credit. That is a price worth paying for a shelter list that anyone
can use.

**Documentation — CC BY 4.0.** These are argued documents rather than reference tables, they
get quoted, and attribution is reasonable to ask for.

## What no licence does

Every licence here disclaims warranty, so that much is covered. **None of them tells a human
that the data is time-sensitive**, and that is the failure this project is most exposed to,
because someone acts on it at 10pm outside a closed door.

So, in plain language and not in legal language:

> **This directory is maintained by volunteers. It shows how old every perishable fact is,
> on purpose. When a check is too old to trust, it says "call first" — that is a real
> answer, not a missing one. A blank means nobody has established something, never that
> there is no restriction. Please call ahead before sending anyone anywhere.**

## Contributing

By contributing you agree your contribution is licensed under whichever of the three covers
the files you touched. No CLA, no copyright assignment, no separate paperwork.

**Never contribute anything about the people being served** — no licence makes that
acceptable, and it is refused rather than edited. See
[`CONTRIBUTING.md`](CONTRIBUTING.md).
