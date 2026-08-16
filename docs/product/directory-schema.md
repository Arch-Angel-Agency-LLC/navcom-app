# Resource Directory — Schema

The knowledge layer's core data. Lives in the [Collective tier](./data-tiers.md):
shared, replicated, cached offline in full, attributed to contributing callsigns.

**Primarily a Console instrument.** The full directory — search, filters, map — belongs to
whoever holds watch, answering [`Query`](../watch/signals.md) for operators in the field.
The Field Terminal carries a deliberately simpler cached copy as fallback.

**Every unanswerable `Query` is logged as a directory gap.** The knowledge layer improves
fastest at exactly the points where it failed someone in real time.

## Hard rule

**Never record information about the people being served.** No names, no descriptions,
no locations of individuals, no medical details, no photographs. This directory describes
*services*, never *recipients*. There is no field for it because there must never be one.

---

## 1. Identity

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable slug, e.g. `stmarys-shelter-downtown`. Never reused |
| `name` | string | What it's actually called locally, not its legal name |
| `type` | enum | See taxonomy below |
| `address` | string | Street address |
| `lat`, `lon` | float | Optional. Enables handoff to the phone's maps app |
| `phone` | string | Optional |
| `notes` | text | The stuff that doesn't fit a column |

### `type` taxonomy

`shelter` · `meal` · `hygiene` (showers, laundry) · `medical` · `harm_reduction` ·
`warming` · `cooling` · `storage` · `legal` · `id_docs` · `mail` · `charging` ·
`veterinary` · `youth` · `dv` (domestic violence) · `detox` · `daytime` (drop-in)

---

## 2. Intake rules

**This is what no official listing has, and the reason the directory is worth
maintaining.** Every field answers: *will they actually take this person, tonight?*

| Field | Values |
|---|---|
| `accepts` | `single_men`, `single_women`, `couples`, `families`, `minors`, `trans_inclusive` |
| `pets` | `yes`, `service_only`, `kennel_onsite`, `no` |
| `sobriety` | `sober_required`, `harm_reduction_ok`, `no_questions` |
| `id_required` | `yes`, `no`, `helps_but_not_required` |
| `referral_required` | boolean |
| `sex_offender_ok` | `yes`, `no`, `unknown` — a real constraint on where people can go |
| `curfew` | Lockout time, if any |
| `max_stay` | e.g. `1 night`, `30 days`, `none` |
| `belongings` | `storage_provided`, `carry_on_only`, `size_limit` |
| `accessibility` | `wheelchair`, `ground_floor`, `none` |
| `languages` | Staff languages actually spoken |
| `cost` | `free`, `sliding`, `fee` |

Use `unknown` freely. **An honest blank beats a confident guess.**

---

## 3. Availability

| Field | Notes |
|---|---|
| `hours` | Per-day open/close |
| `intake_hours` | When you can actually get in — often narrower than "open" |
| `seasonal` | `year_round`, `winter_only`, `summer_only`, `weather_activated` |
| `capacity_signal` | `usually_available`, `often_full`, `call_first`, `unknown` |

`capacity_signal` is deliberately coarse. We are not building a bed-availability API —
that data is stale within hours and would be the most dangerous field in the system.
**"Call first" is a first-class, honest answer.**

---

## 4. Verification and decay

| Field | Notes |
|---|---|
| `last_verified` | Date |
| `verified_by` | Callsign or `anonymous` — never a legal name |
| `method` | `in_person`, `phone`, `staff_confirmed`, `secondhand`, `website` |
| `flag` | `ok`, `reported_closed`, `reported_wrong`, `permanently_closed` |

### Volatility classes

**Different fields rot at different speeds.** Staleness is per field-group, not per
record.

| Class | Fields | Stale after |
|---|---|---|
| **Static** | address, type, accessibility | 1 year |
| **Slow** | intake rules, cost, languages, max stay | 90 days |
| **Seasonal** | seasonal status, weather activation | 30 days, or at season change |
| **Volatile** | hours, intake hours, capacity signal | 14 days |

### Confidence

Derived, never entered by hand:

```
in_person or staff_confirmed, within window    → high
phone, within window                           → medium
website or secondhand, within window           → low
past its window                                → stale
flag != ok                                     → suspect (overrides all)
```

### Display rules

These exist because of one failure mode: a confident wrong answer that sends someone
somewhere that turns them away.

1. **Never show a volatile field without its age** — "Open until 10pm *(verified 3 days ago)*"
2. **Stale volatile data displays as "call first,"** never as the old value
3. **`suspect` records surface the flag first**, above all other content
4. **Anyone can flag in one tap** without being able to fully update — reporting must
   always be easier than fixing
5. **Blank renders as "unknown,"** never as absence of a restriction
6. **Seeded entries look visibly different from operator-verified ones.** A confidence
   tag in the data model doesn't help someone scanning a list at 10pm. Low-confidence
   data that *looks* authoritative is more dangerous than no data at all

---

## 5. Contribution

Corrections are credited to the contributing callsign, building
[standing on the contribution axis](./identity.md) — visible expertise with no legal
identity attached. Anonymous contribution is always available for operators who want no
attribution at all.

**Correction must work offline and queue for sync.** The moment an operator discovers a
listing is wrong is the moment of worst connectivity and highest urgency — outside a
closed shelter, at night, with someone waiting. A correction path that needs signal or a
form is a correction path that never gets used.

Reporting that something is wrong requires one tap and no account.

### Who actually maintains this

Not everyone, and the design shouldn't pretend otherwise. Maintenance comes from a small
core with direct motivation — operators who bear the consequences of bad data, plus crews
where a lead assigns it — while most people only ever read.

**Design for the minority who contribute and make free-riding completely costless.**
Nothing in the app should pressure, shame, or gate a read-only operator. A directory that
demands reciprocity gets abandoned by the people it most needs to reach.


---

## Columns

```
id, name, type, address, lat, lon, phone,
accepts, pets, sobriety, id_required, referral_required, sex_offender_ok,
curfew, max_stay, belongings, accessibility, languages, cost,
hours, intake_hours, seasonal, capacity_signal,
last_verified, verified_by, method, flag, notes
```

Importable starter: [`../../data/resources.seed.csv`](../../data/resources.seed.csv)
