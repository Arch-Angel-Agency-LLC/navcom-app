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

## Position never leaves the people watching you

**Whatever presence is set to, position goes only to the watch and to paired peers. There
is no setting that publishes it, and there is no combination of settings that adds up to
one.**

This is not caution, it is a failure mode chosen deliberately. Operators forget things.
Somebody will leave position sharing on and broadcast from their kitchen.

- If position can never be public, that mistake shows their home to four people who already
  know where they live
- If position can be public, the same mistake writes their home address into a permanent,
  machine-readable, un-deletable record that anyone can harvest

Same lapse. Wildly different consequence. **A design where the worst mistake stays inside
the trust circle is the one to have.**

Three things bound the window further, and all three are cheap:

- Position rides on being signed on. Stand down and it stops — so nobody broadcasts from
  home unless they are on patrol from home
- Sign-on carries a declared end time, so it expires by itself
- While position is live the app shows it, unmissably and continuously. The same reason a
  phone shows the location arrow

## Public presence is a name, never a pin and never a number

An operator set to `city` or `network` presence is saying *"Raven is out tonight."* That is
all it says.

- **A name, not a count.** *"Three operators out"* invites gaming and tells a reader
  nothing; a name tells them who. Same rule as everywhere else in this system
- **No position, at any precision.** See above
- It exists so the network has a pulse — so somebody opening the app can see it is real and
  in use. That is a genuine need and this is the cheapest honest way to meet it

**The proof that the network is alive is the directory, not the operators.** A shelter entry
that reads *"checked 3 days ago by Wren"* says the work is being done, by a named person,
recently. A pin only says somebody is standing somewhere. The directory is already public,
already maintained, and exposes nobody.

## The switches underneath

Each is independently settable regardless of preset:

| Switch | Values |
|---|---|
| Presence | off · team · city · network — team is useful at 3 operators, network needs far more. Above `team` it is a name and nothing else |
| Position sharing | off · per-op opt-in (never persistent). **Recipients are the watch and paired peers only** — this switch has no public setting |
| Position precision | coarse · precise |
| Card discoverability | off · team · network |
| Endorsements | receive only · receive and give |
| Op recap generation | off · on request |
| Lightning address | off · on — **outside presets entirely** |

## The watch sees what you sign on with

Signing on for a shift shares area, expected duration and contact times with **whoever
holds the board** — that's the point of being watched, and it's scoped to the watch
rather than broadcast.

- **Ghost operators can still sign on.** Watch sees you're out and roughly where; nobody
  else does. Being watched over and being visible to the network are different things
- Position sharing remains separately opt-in, per session
- Signing on is always a deliberate act. An operator who doesn't sign on isn't watched,
  and the terminal never does it automatically

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
- **No setting, preset or combination that publishes a position.** Not as an advanced
  option, not behind a warning, not for operators who ask for it
