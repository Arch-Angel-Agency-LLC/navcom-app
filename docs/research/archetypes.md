# The Twelve

A stress-test roster for volunteer street outreach tooling. Chosen for **coverage of the
risk surface**, not for typicality — deliberately weighted toward people who refuse,
break, or abandon software.

Structured on zodiac cusp pairings (element + modality) as an organizing device for the
Archangel Agency class system. The astrology is scaffolding; the stresses are the point.

> ⚠️ Constructed personas, not interviewed users. See [README](./README.md).

---

### 1. Cusp of Rebirth — Pisces (Water Mutable) + Aries (Fire Cardinal)
**The Convert.** Formerly unhoused, now doing outreach on the same blocks where she
slept. Knows which shelters actually take people who are using.

*"I want to add what I know without anyone asking who I am or how I know."*

**Stresses:** No digital history, no vouches, prepaid Android 8, 400MB free. Your most
valuable data contributor, ranked untrusted by any reputation system.
→ **Breaks: vouching, device floor, storage budget.**

### 2. Cusp of Power — Aries (Fire Cardinal) + Taurus (Earth Fixed)
**The Team Lead.** Runs a nine-person crew. Feels responsible if anyone gets hurt.

*"I want to see who's out and know they got home."*

**Stresses:** Wants rosters, oversight, accountability. Pulls hard toward centralization
and away from pseudonymity.
→ **Breaks: the no-hierarchy assumption.**

### 3. Cusp of Energy — Taurus (Earth Fixed) + Gemini (Air Mutable)
**The Quartermaster.** Owns the storage unit. Tracks socks, water, hygiene kits, sizes.

*"I want to know what we handed out so I know what to restock."*

**Stresses:** Needs shared state edited offline by several people at once.
→ **Breaks: conflict resolution, sync model.**

### 4. Cusp of Magic — Gemini (Air Mutable) + Cancer (Water Cardinal)
**The Connector.** Knows everyone in four cities. Makes introductions.

*"I want to tell Phoenix that Raven's coming through next month."*

**Stresses:** Will cheerfully leak cross-team information, because connecting people
*is* his contribution.
→ **Breaks: compartmentalization between teams.**

### 5. Cusp of Oscillation — Cancer (Water Cardinal) + Leo (Fire Fixed)
**The Heart.** Gives everything for six weeks, then vanishes for three months.

*"I want to come back after a break without a wall of guilt."*

**Stresses:** Missed check-ins fire duress alerts while she's asleep. False alarms train
the team to ignore real ones.
→ **Breaks: check-in semantics, notification design, retention assumptions.**

### 6. Cusp of Exposure — Leo (Fire Fixed) + Virgo (Earth Mutable)
**The Public Face.** Large following, films everything, brings in donations.

*"I want to share what we did tonight."*

**Stresses:** Screenshots the app and posts it — leaking a teammate's callsign,
location, and face. His value is real; his opsec is a liability.
→ **Breaks: everyone else's pseudonymity, via one person's posting.**

### 7. Cusp of Beauty — Virgo (Earth Mutable) + Libra (Air Cardinal)
**The Medic.** First aid and harm reduction. Precise, careful.

*"I want the naloxone supply list and the nearest ER that won't call police."*

**Stresses:** If the directory says open and it isn't, someone is harmed. Refuses to log
anything resembling another person's medical information.
→ **Breaks: accuracy stakes, liability, the temptation to log recipients.**

### 8. Cusp of Drama & Criticism — Libra (Air Cardinal) + Scorpio (Water Fixed)
**The Skeptic.** Twelve years in. Watched three apps come and go, and two people get
doxxed.

*"Show me exactly what leaves my phone or I'm not installing it."*

**Stresses:** Will proxy your traffic, read your source, and find the leak. Win him and
adoption follows; lose him and nothing else matters.
→ **Breaks: any hand-waving on the privacy model. Your most valuable adversary.**

### 9. Cusp of Revolution — Scorpio (Water Fixed) + Sagittarius (Fire Mutable)
**The Protest Medic.** Street medic and legal observer at demonstrations.

*"I need this to be useless to anyone who takes my phone."*

**Stresses:** Needs panic wipe and zero retained history. Directly contradicts durable
logging, and makes any patrol log a subpoena target.
→ **Breaks: log retention. An irreducible conflict.**

### 10. Cusp of Prophecy — Sagittarius (Fire Mutable) + Capricorn (Earth Cardinal)
**The Trainer.** Teaches de-escalation and bystander intervention.

*"I want new people to arrive already knowing the ground rules."*

**Stresses:** Wants versioned guidance and onboarding — pulls toward being a knowledge
base. Generic or wrong content reads as an insult to his expertise.
→ **Breaks: scope discipline, content quality bar.**

### 11. Cusp of Mystery & Imagination — Capricorn (Earth Cardinal) + Aquarius (Air Fixed)
**The Ghost.** Patrols alone. No team, no shared callsign, no location, ever.

*"I want the resource list. I want to give nothing back."*

**Stresses:** Refuses every social feature. If the tool isn't useful at n=1 with location
off, he's gone.
→ **Breaks: presence, check-in, vouching. The single-player test made flesh.**

### 12. Cusp of Sensitivity — Aquarius (Air Fixed) + Pisces (Water Mutable)
**The Outpost.** Small town, two hours from the nearest peer, one bar of signal.

*"I want it to work in the parking lot with no service."*

**Stresses:** Presence shows an empty map. Vouching has nobody local. Offline isn't
aspirational for her — it's the default state.
→ **Breaks: cold start, and every feature requiring peers.**

---

## Coverage check

| Risk surface | Covered by |
|---|---|
| Low-end hardware, limited data | Convert |
| Centralization pressure | Team Lead |
| Multi-writer offline sync | Quartermaster |
| Information leakage between groups | Connector |
| Burnout, re-entry, alarm fatigue | Heart |
| Opsec violated from inside | Public Face |
| Safety-critical accuracy | Medic |
| Adversarial privacy audit | Skeptic |
| Device seizure, legal exposure | Protest Medic |
| Content quality, onboarding | Trainer |
| Refusal of all social features | Ghost |
| Cold start, no connectivity | Outpost |
