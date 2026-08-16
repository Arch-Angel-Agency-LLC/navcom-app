# Phase 0 — Prove the data, write no code

Phase 0 answers the only question that can kill this project: **will street outreach
people maintain a shared resource directory?**

If they will, everything else is tractable. If they won't, no amount of engineering
saves it, and we've learned that in four weeks instead of a year.

**Nothing in Phase 0 is software.** Do not scaffold a framework. Do not pick a
database. The repo holds the schema and the findings; the working data lives in a
shared spreadsheet that people can edit from a phone.

---

## What NavCom is

An **offline-first field reference and safety kit** for street outreach.

- A directory of what's actually open, and who they'll take
- Field guidance (de-escalation, first aid, rights)
- A private incident log
- Panic wipe
- Duress with SMS fallback

No accounts. No profiles. No server that knows anything about anyone.

## What NavCom is not

Cut deliberately, after testing twelve user archetypes against every candidate feature.
Each of these failed on the people it most needed to serve:

| Cut | Why |
|---|---|
| Live position map | 5 hard refusals; highest build cost, worst reception |
| Vouching / trust graph | Ranks lived-experience contributors as untrusted; creates a queryable map of pseudonymous activists |
| Ambient presence | Actively harms isolated and burnt-out members |
| Team chat | Discord and Signal already do it |
| Op scheduling | Same |
| Inventory | One power user |
| Push notifications | FCM/APNS leak recipient metadata to Google and Apple |

If one of these comes back, it must come back because a real user hit real friction —
never because it sounded good.

## The retention target

**Not engagement. Never giving them a reason to delete it.**

This is a first aid kit, not a social app. Nobody opens a first aid kit weekly, and
nobody throws one away. That means: no notifications, no streaks, no reminders, no
"you haven't patrolled in 60 days," no account nags, no social prompts.

## The device floor

A prepaid Android 8 with ~400MB free. Not your phone. If it doesn't run there, it
doesn't ship.

---

## The protocol

**Week 0 — Seed.**
Pick one city (yours). Create a shared spreadsheet using
[`directory-schema.md`](./directory-schema.md) as the column definition. Seed 15–25
entries from public sources (211, city listings, shelter websites). Expect a
meaningful share of it to be wrong — that's the point.

**Weeks 1–4 — Use and correct.**
Get 3–4 outreach people using it in the field. Ask them to fix what's wrong and add
what's missing. Do not chase them. Do not remind them. Silence is data.

**Week 4 — Decide.**

## Success criteria

Go if **all three** hold:

1. **Someone corrected an entry** without being asked.
2. **Someone added an entry** you didn't seed.
3. **Someone used it during an actual op** and said so.

Kill (or rethink) if:

- Corrections only happen when you personally prompt them
- Everyone reads, nobody writes
- The data is materially stale by week 4 and nobody noticed

## The one risk to watch

The most dangerous failure isn't neglect — it's **a confident wrong answer**. If
someone is sent to a clinic listed as open and it's closed, and harm follows, the
directory is finished and word travels. Every display decision in later phases
follows from this: never show volatile data without its age, and always allow
"call first" as an honest answer.

## Ownership check

This project is roughly **20% code and 80% content curation**. The engineering is the
easy part. If nobody is prepared to own data quality on an ongoing basis, stop here —
that's a legitimate outcome and it costs four weeks instead of a year.
