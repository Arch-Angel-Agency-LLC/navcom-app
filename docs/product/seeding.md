# Seeding the Directory

A brief for whoever builds the scraper — human or agent. It is written to be picked up cold.

The directory is the only part of NavCom that works with nothing else: no watch, no signal,
no peers. It currently holds **twelve invented records**, which means the one thing that
always works is the one thing that is useless.

---

## The rule that governs everything here

**Seed structural facts. Never seed intake rules.**

| Seed these | Leave these `unknown`, forever, until a human confirms them |
|---|---|
| `name` `address` `lat` `lon` `phone` `type` `hours` `cost` | `sobriety` `pets` `id_required` `referral_required` `sex_offender_ok` `reports_to` `curfew` `max_stay` `belongings` `capacity_signal` |

The left column is published, checkable, and wrong in boring ways. The right column is
**why the directory exists** — and it is absent from every public listing precisely because
nobody maintains it.

**A plausible guess in the right-hand column is the fastest way to end this project.** Not a
quality problem: someone walks two miles at 11pm on the strength of `pets: yes` and gets
turned away. The Medic archetype names confident wrong guidance as the kill trigger, and
this is exactly where it would enter.

A scraper that cannot find a field **must leave it empty.** Empty renders as *unknown*,
which is a true statement. There is no inference, no "most shelters allow X", no defaulting,
and no LLM asked to read a website and fill in the blanks.

## What a seeded record must carry

Every seeded row sets these, and the display rules do the rest:

```
method       = "website"      # never "in_person" or "phone"
verified_by  = ""             # nobody checked it, and the record must say so
last_verified= <scrape date>  # when the PAGE was read, not when the fact was true
flag         = "ok"
```

That combination makes a record render **visually distinct and marked unverified** on every
surface, which is already tested against the built HTML. The scraper's job is to be honest
about provenance; the display layer is already honest about what that provenance is worth.

## Where the public half comes from

Roughly in order of quality. Confirm licensing per source before shipping any of them — most
are open, some are not, and this list is a starting point rather than a cleared one.

| Source | Gives | Notes |
|---|---|---|
| **HUD HIC / PIT** | Shelters, beds, by CoC region | Annual, national, authoritative on what exists |
| **211 / United Way** | The broadest listing of services | Coverage and terms vary by region |
| **City & county open data** | Shelters, warming centres, clinics | Best quality where it exists, absent where it does not |
| **OpenStreetMap** | `social_facility`, `healthcare`, addresses, coordinates | Open licence, uneven coverage, good for geocoding |
| **Health centre lookups** | Federally qualified clinics | Reliable for `medical` |
| **Individual org websites** | Hours, phone, current status | Last resort per record, and the only place `hours` is often found |

## Shape of the thing

Per region, producing `data/regions/<slug>/resources.csv`.

1. **Fetch** — cache raw responses on disk. Re-running must not re-hit anyone's server, and
   a source that changes shape should be diffable against what it returned last time
2. **Normalise** — map each source's vocabulary onto `ResourceType`. Anything that does not
   map cleanly becomes `other` rather than a guess
3. **Deduplicate** — the same shelter appears in three sources under two names. Match on
   proximity plus name similarity, and **when unsure, keep both** — a duplicate is a
   nuisance, a wrongly-merged record is two half-truths welded together
4. **Emit** — the existing CSV schema, and `npm run check:data` must pass. It already
   validates every enum and every date

**Ids are global across regions** and must be stable across runs, or every re-scrape looks
like a mass deletion followed by a mass creation. Derive them from something durable —
source plus source-id — never from a row number.

## Rules the scraper itself must follow

- **Identify itself** in the user agent, with a contact address. Anyone running a small
  nonprofit's website deserves to know who is hitting it and how to say stop
- **Rate limit, and respect `robots.txt`.** These are organisations serving people in
  crisis; a scraper that degrades a shelter's website has done direct harm
- **Never scrape a page behind a login**, and never anything about an individual. Invariant
  1 has no exceptions and this is the likeliest place to trip it
- **Fail loudly and partially.** A source that breaks should leave the other sources' records
  intact and say which one broke. A run that silently produces half a region is worse than
  one that stops

## What it must never do

- **Never write to the intake columns.** Not from a website's FAQ, not from a phone call
  transcript, not from a model that read the page and is confident
- **Never invent `verified_by`.** An empty value is the true one. A scraper cannot verify
  anything; it can only report where it read something
- **Never mark a record verified because several sources agree.** Three listings copied from
  one another is one listing
- **Never delete a human-verified record.** If a scrape no longer finds a place that somebody
  checked in person, that is a **flag for review**, not a deletion. The human knew something
  the scraper does not

## Where this leaves the directory

Skeletons everywhere the scraper runs — names, addresses, phone numbers, marked unverified.
Genuinely useful at 11pm and honest about what it is.

Real answers only where an operator has been. That is the part no scraper produces, and
[`propagation.md`](propagation.md) is about how it accrues.

**Scrape wide. Verify narrow.** A skeleton in twenty metros and real intake rules in the one
where somebody actually works.
