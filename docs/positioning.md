# Positioning

The document you hand someone instead of explaining. One page, no lore, no spec.

---

## The sentence

> **NavCom is non-institutional dispatch for volunteer patrol networks.**
>
> Someone is always on watch while operators are out. Not an app people check — a post
> someone holds.

**"Non-institutional" is doing real work in that sentence.** Dispatch and CAD systems are
the closest functional match — a console operator holding a board of units in the field —
and every one of them is employment-based and assumes authority over the people it
dispatches. NavCom has neither. Nobody is paid, nobody is ordered, and whoever holds the
board holds a *post, not a rank*. Remove that word and the description is wrong.

## Who it's for

**Real-life superheroes.** Volunteer patrol and outreach networks — people who go out
under a callsign, on their own time, with no agency behind them.

That's the primary population and the design is shaped for it: callsigns and emblems as
real identity, sign-on as ceremony, [Herocore](research/prior-art.md) as the community
hub NavCom exports to rather than competes with.

It serves adjacent people well without being built for them. Street medics, mutual aid
crews and outreach workers face the same night and need the same answers, and the
[resource directory](product/directory-schema.md) is readable on the open web by anyone,
with no install and no account. That's deliberate — see
[`product/propagation.md`](product/propagation.md).

## Star and Nav

The architecture is encoded in the two names, and it was not designed that way on purpose.

**Star** is the fixed reference — distant, above, true regardless of where you're standing.
[Starcom](ecosystem.md) looks down and out: orbital altitude, long horizon, the shape of
things.

**Nav** is not a map. Navigation is getting from *here* to *there* through actual terrain.
It only exists while you're moving, it's always local, and it's about the hazards between
you and where you're going.

**You navigate by the stars.** One is the frame you orient against; the other is how you
cross the next block.

> **Starcom is the guy in the chair for the world. NavCom is the guy in the chair for
> tonight.**

There's a second reading worth keeping: on a ship's bridge, Navigation and Communications
are separate stations. NavCom fuses them into one post that both knows where everyone is
and can talk to them. That fusion *is* the watch.

## What operators need from it

Six things. Superhero fiction is remarkably consistent about all of them, which is why
[the model came from fiction](research/lore.md) rather than from comparable software.

1. **Someone in your ear who knows where you are.** The most reliable trope in the genre —
   the hero is never truly alone, even operating alone
2. **A call that is heard.** Not a message, a summons that *lands*. The emotional content
   isn't the sending, it's the certainty of arrival — which is why every signal gets an
   acknowledgement and silence is never a response
3. **Knowing who else is out.** Solidarity, not surveillance. Completely different feeling
   from being tracked
4. **Going on duty meaning something.** You put on the suit. Sign-on is the threshold act
   that converts a person into an operator
5. **Coming home and being counted.** `Stood down`, confirmed by someone. The genre almost
   never shows this and it may matter most of all
6. **The thing that makes you more than one person.** A lone vigilante is a guy in a mask.
   A network with a watch, a protocol, accountability and a record is an organisation

## What it is not

Each of these is a failure mode the design has already been rescued from, not a
hypothetical:

| Not | Because |
|---|---|
| A social app | No feed, no browsing people, no comments, anywhere. [Principle 2](principles.md) does more anti-drift work than every other rule combined |
| A tactical map | The device floor is a prepaid Android 8 with 400MB free, and a live position map drew the most refusals of any feature tested |
| A humanitarian directory | The directory is what operators *do*, not what the product is. The watch is the product |
| Dispatch or CAD | Institutional, employment-based, assumes authority over its units. NavCom has none of that |
| A chat app | Teams already have Discord and Signal, and those work. NavCom builds what chat structurally can't: defined responders and response windows |

## What it never does

- Records anything about the people being served. No field, no convention, no exception
- Lets a `Distress` signal end anywhere but in a human — or tells the operator it couldn't
- Infers duress from silence, missed windows, or inactivity
- Presents an agent as a person
- Holds a legal name

Full set and conflict-resolution order in [`principles.md`](principles.md).

## The short versions

**One line:** Non-institutional dispatch for volunteer patrol networks.

**One paragraph:** NavCom is a watch. When operators go out, a named person at a console —
or an agent when nobody is on station — holds a board showing who's out, where roughly,
and when they last made contact. Operators signal rather than browse: going on station,
routine contact, a question, a request for help, distress, standing down. Every signal
gets an answer. The question that makes it worth having on an ordinary night is `Query` —
you're outside a closed shelter at 10pm with someone who needs a bed, and instead of
tapping through a database one-handed in the cold, you ask the person with both hands free
and a full screen.
