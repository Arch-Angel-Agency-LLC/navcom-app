# Resource Directory — Schema

Column definitions for the Phase 0 spreadsheet. This is the shape the data takes; the
tool that holds it comes later.

## Hard rule, before anything else

**Never record information about the people being served.** No names, no descriptions,
no locations of individuals, no medical details, no photographs. This directory
describes *services*, never *recipients*. There is no field for it because there must
never be a field for it.

---

## 1. Identity

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable slug, e.g. `stmarys-shelter-downtown`. Never reused. |
| `name` | string | What it's actually called locally, not its legal name |
| `type` | enum | See taxonomy below |
| `address` | string | Street address |
| `lat`, `lon` | float | Optional. Enables "open in maps" handoff |
| `phone` | string | Optional |
| `notes` | text | Free text — the stuff that doesn't fit a column |

### `type` taxonomy

`shelter` · `meal` · `hygiene` (showers, laundry) · `medical` · `harm_reduction` ·
`warming` · `cooling` · `storage` · `legal` · `id_docs` · `mail` · `charging` ·
`veterinary` · `youth` · `dv` (domestic violence) · `detox` · `daytime` (drop-in)

---

## 2. Intake rules

**This is the part no official listing has, and the reason the directory is worth
maintaining.** Every field here answers "will they actually take this person, tonight?"

| Field | Values | Notes |
|---|---|---|
| `accepts` | multi | `single_men`, `single_women`, `couples`, `families`, `minors`, `trans_inclusive` |
| `pets` | enum | `yes`, `service_only`, `kennel_onsite`, `no` |
| `sobriety` | enum | `sober_required`, `harm_reduction_ok`, `no_questions` |
| `id_required` | enum | `yes`, `no`, `helps_but_not_required` |
| `referral_required` | bool | |
| `sex_offender_ok` | enum | `yes`, `no`, `unknown` — real constraint on where people can go |
| `curfew` | time | Lockout time, if any |
| `max_stay` | string | e.g. `1 night`, `30 days`, `none` |
| `belongings` | enum | `storage_provided`, `carry_on_only`, `size_limit` |
| `accessibility` | multi | `wheelchair`, `ground_floor`, `none` |
| `languages` | multi | Staff languages actually spoken |
| `cost` | enum | `free`, `sliding`, `fee` |

Use `unknown` freely. **An honest blank beats a confident guess** — that distinction is
the whole quality model.

---

## 3. Availability

| Field | Type | Notes |
|---|---|---|
| `hours` | structured | Per-day open/close. Note *intake* hours separately if different |
| `intake_hours` | structured | When you can actually get in — often narrower than "open" |
| `seasonal` | enum | `year_round`, `winter_only`, `summer_only`, `weather_activated` |
| `capacity_signal` | enum | `usually_available`, `often_full`, `call_first`, `unknown` |

`capacity_signal` is deliberately vague. We are not building a bed-availability API —
that data goes stale in hours and would be our most dangerous field. **"Call first" is
a first-class, honest answer.**

---

## 4. Verification and decay

Every record carries:

| Field | Type | Notes |
|---|---|---|
| `last_verified` | date | |
| `verified_by` | string | Callsign or `anonymous` — never a legal name |
| `method` | enum | `in_person`, `phone`, `staff_confirmed`, `secondhand`, `website` |
| `flag` | enum | `ok`, `reported_closed`, `reported_wrong`, `permanently_closed` |

### Volatility classes

**The core insight: different fields rot at different speeds.** Staleness is per
field-group, not per record.

| Class | Fields | Goes stale after |
|---|---|---|
| **Static** | address, type, accessibility | 1 year |
| **Slow** | intake rules, cost, languages, max stay | 90 days |
| **Seasonal** | seasonal status, warming/cooling activation | 30 days, or at season change |
| **Volatile** | hours, intake hours, capacity signal | 14 days |

### Confidence

Derived, never entered by hand:

```
in_person or staff_confirmed, within window    → high
phone, within window                           → medium
website or secondhand, within window           → low
anything past its window                       → stale
flag != ok                                     → suspect (overrides all)
```

### Display rules these force

Later phases must obey these. They exist because of one failure mode: a confident
wrong answer that sends someone somewhere that turns them away.

1. **Never show a volatile field without its age.** "Open until 10pm *(verified 3 days ago)*"
2. **Stale volatile data displays as "call first,"** not as the old value.
3. **`suspect` records surface the flag first**, above all other content.
4. **Anyone can flag in one tap** without being able to fully update — reporting that
   something is wrong must be far easier than fixing it.
5. **Blank renders as "unknown,"** never as absence of a restriction.

---

## 5. Contribution

Phase 0: anyone with the spreadsheet link can edit. That's the point — friction here
kills the experiment.

Later phases: contributions must be **anonymous and unlinkable**. No account system
means no identity to attach, which is both the privacy property and the reason
contribution stays easy. Three of the twelve archetypes stop contributing the moment
writes become attributable.

---

## Phase 0 seed columns (copy into the sheet)

```
id, name, type, address, lat, lon, phone,
accepts, pets, sobriety, id_required, referral_required, sex_offender_ok,
curfew, max_stay, belongings, accessibility, languages, cost,
hours, intake_hours, seasonal, capacity_signal,
last_verified, verified_by, method, flag, notes
```
