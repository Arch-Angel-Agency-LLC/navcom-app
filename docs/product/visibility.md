# Visibility

Operators want genuinely opposite things. Some film everything and have a following;
some share nothing and never will. Both get a complete app.

## Presets set toggles — they are never a mode

A preset applies a set of individual switches, once. It is **not** a persistent state the
app enforces afterwards.

- Applied at onboarding, re-runnable any time
- **Never displayed on a persona.** Nobody can see which preset an operator chose, or
  that they chose one
- Every underlying switch stays individually visible and adjustable
- Changing one switch afterwards breaks nothing and creates no inconsistent state

This distinction matters. A global mode bundles independent decisions — flip it for one
reason and you've silently changed four other things. That's how people get exposed: not
by a bad decision, but by a bundled one.

## The three presets

| Preset | Presence | Position in ops | Endorsements | Op recap | Discoverable card |
|---|---|---|---|---|---|
| **Ghost** | off | off | receive only | off | off |
| **Team** | team only | opt-in per op | on | off | team only |
| **Open** | network | opt-in per op | on | on | on |

**Team is the default.** Ghost is a complete, fully useful configuration — knowledge
layer, safety kit, personal record, incident log, standing. An operator can run Ghost
forever and never be a lesser user of the app.

## The switches underneath

Each is independently settable regardless of preset:

| Switch | Values |
|---|---|
| Presence | off · team · city · network — team is useful at 3 operators, network needs far more |
| Position sharing | off · per-op opt-in (never persistent) |
| Position precision | coarse · precise |
| Card discoverability | off · team · network |
| Endorsements | receive only · receive and give |
| Op recap generation | off · on request |
| Lightning address | off · on — **outside presets entirely** |

## Funding sits outside visibility

The operator who most needs donations may be the one who most needs to stay invisible.
Bundling them would force a trade that doesn't actually exist — a Lightning address is a
string shown to whoever the operator chooses, requiring no presence, no position, and no
public artifact.

So it's independently toggleable from every preset, Ghost included. See
[`funding.md`](./funding.md).

## Reducing exposure: say the true thing

Moving toward less visibility is not symmetrical with moving toward more. Anything
already published stays published.

Whenever an operator reduces exposure, the UI states it plainly:

> This changes what you share from now on. It can't unshare what's already out.

A control that implies otherwise is a false promise, and this community will notice.

## Never

- No preset shown on a persona, in a roster, or anywhere another operator can see it
- No "verified" or "public" style badge derived from visibility choices
- No prompt, nudge or suggestion to increase visibility
- No feature degraded to pressure an operator out of Ghost
