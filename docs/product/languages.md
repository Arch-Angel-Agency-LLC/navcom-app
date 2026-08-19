# Languages, Scripts, and Not Needing to Read

NavCom starts in one country with one community because that is where the first operators
are, not because that is what it is for. Street outreach is the same work in Osaka, Suva,
Chennai and Glasgow, and the design has to be able to go there without being rewritten.

This page is about what that costs and what is honestly achievable.

---

## The claim we can make, and the one we cannot

**Cannot:** *"NavCom supports every language."* Nobody supports every language. Claiming it
is the same failure as claiming a cached directory that does not exist, and it would be
caught by the first person who tried Tetum.

**Can, and it is the more useful promise:**

> **Nothing breaks on any script, and a missing translation degrades into English rather
> than into a broken screen.**

Everything below serves that sentence.

## Where we already are, by accident of good decisions

- **Every payload is JSON over NIP-44** — UTF-8 throughout. Japanese, Devanagari, Arabic,
  Cherokee and Samoan all work today, with no change, because nothing anywhere assumes an
  encoding
- **The directory CSV is UTF-8**, and a shelter in Tokyo is stored under its own name in its
  own script. There is no transliteration step and there must never be one
- **The font stacks lead with `system-ui`**, so the operating system supplies a face that
  can draw the script. A stack that led with Latin-only fonts would have to be unpicked;
  ours does not
- **Callsigns have no character restrictions.** An operator can be ケン or Ngā or Ω

## Where we are not

### Layout has hard-coded direction

The terminal uses `padding-left`, `border-left` and `margin-left` in a dozen places. In
Arabic, Hebrew, Urdu or Persian those are on the wrong side, and a right-to-left screen with
left-aligned furniture reads as broken rather than foreign.

Mechanical to fix and worth doing before there is much more CSS: **logical properties
everywhere** — `padding-inline-start`, `border-inline-start`, `margin-inline-end` — and
`dir` set from the locale.

### There is no message catalogue

Every string is inline in a component. That is fine while there is one language and becomes
the whole problem at two.

What fits the constraints here:

- **One JSON catalogue per locale**, and **only the active one shipped.** The device floor
  is a prepaid Android 8; bundling forty languages to use one is not a rounding error
- **Cached with the shell**, because an operator changing language is not going to have
  signal when they next open it
- **A missing key falls back to English and renders**, never to a blank or a raw key name.
  Half-translated is a normal state for a volunteer translation and must look deliberate
- Detected from the device, overridable, and **the override must be reachable without
  reading the current language** — somebody on a borrowed phone set to a language they do
  not speak still needs to find it

### The taxonomy is a national assumption

`shelter`, `warming`, `id_docs`, `detox` describe how services are organised in the US and
UK. Japan's welfare structures do not partition that way, and neither do India's or Fiji's.

The existing rule already covers it and now applies internationally: **extending the `type`
taxonomy needs a human with local knowledge, and is not agent work.** A scraper meeting a
category it cannot map reports it rather than guessing, which is exactly the mechanism a new
country needs.

## Buttons that do not require reading

The request was images over words. The honest version is narrower and more useful.

**Icons are not universal.** They are learned. Every study of icon comprehension across
cultures finds the same thing, and the icons people think are obvious are obvious because
they have seen them a thousand times. An icon-only field terminal would be unusable for
exactly the operator it was meant to help.

**What actually works in the dark, one-handed, in a hurry, is not reading — it is muscle
memory.** Three things carry it:

| | |
|---|---|
| **Position** | The same action in the same place on every screen, every time. This is the load-bearing one |
| **Size and shape** | The urgent thing is the biggest thing, and shaped unlike its neighbours |
| **Gesture** | Distress is a *hold*, and a hold feels different from a tap before you have read anything |

Colour helps and cannot be trusted alone: red means danger in some places and luck or
celebration in others, and a meaningful fraction of operators cannot distinguish it anyway.

So the rule is:

> **Position, size and gesture carry recognition. The icon supports it. The word confirms
> it — and the word is translated.**

Not icon-only. Not word-only. And the layout stays put across languages, so an operator who
learned the screen in one language can still work it in another.

**Distress already follows this** and is the model for the rest: bottom of the screen, on
its own, biggest target, its own colour, and a hold rather than a tap. Somebody could
operate it having never read the word.

## The directory speaks two different languages at once

Worth stating because they are easy to conflate:

- **The interface language** is what the operator reads
- **`languages` on a record** is what the *service* speaks — whether the shelter has anybody
  who can talk to the person you are bringing

An operator reading English in Sydney needs to know a service has Arabic and Vietnamese
speakers. Those are unrelated facts and the second one is often the whole question.

`languages` already exists in the schema and every region manifest already lists what the
area needs. The scraper fills it where a source has it, and it is a field a local operator
can improve.

## What stays human, per language

- **Playbooks.** Not translation — authorship. Safety guidance written for one legal system
  and one set of services is wrong somewhere else, and a translated wrong playbook is worse
  than none. Already human work; now human work *per locale*
- **The intake rules.** The half no scraper produces, everywhere
- **The taxonomy**, per country

## Order of work

1. **Logical CSS properties**, before there is more CSS. Cheap now, tedious later
2. **Message catalogue and one-locale bundling**, when there is a second language to hold
3. **A second language chosen because somebody is waiting for it**, not to prove the
   mechanism works. Spanish is the obvious first for existing US regions
4. Everything else when an operator in that place asks

**Nothing here is claimed publicly until it ships**, and "available in N languages" is a
claim about translations that exist rather than about a mechanism that could hold them.
