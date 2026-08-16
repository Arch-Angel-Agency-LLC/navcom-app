# Lore as Design Source

The watch model did not come from studying comparable software. It came from fiction —
deliberately, and this page exists so that stays legible to whoever works on this next.

## Why fiction

Every attempt to derive this product from existing categories produced a reskin. "Like
ATAK but simpler." "Like a mutual aid tool but for RLSH." "Like a social network but
themed." Each was coherent, each was somebody else's product with different paint.

The reason is structural: **commercial software is shaped by what can be monetised,
automated, and scaled.** A volunteer taking a console shift on a Friday night is none of
those things, so no market product contains that idea. It only exists in stories, where
organisations are shaped by what makes them *work* rather than what makes them
profitable.

So the method is: **take mechanics, not aesthetics.** Not the holographic displays — the
duty roster underneath them.

## What we took

**The Watchtower (JLU).** Monitor duty. A named person on station for a defined shift,
responsible for the network while they hold it. Not notifications — a post. This is the
spine of the entire product.

**Oracle (Batman).** The operator who can't be in the field running comms, intel and
overwatch for those who are — and being the most important node in the network rather
than support staff. This produced two things: the asymmetric Console/Field split, and
`Query`, where the person with a laptop does the lookup for the person in the cold.

**Assemble (Avengers).** A call that gathers whoever is available for a specific thing,
right now, from people who are not employees and owe no attendance. Became `Assist`.

**Comms discipline (everywhere).** Terse, structured, acknowledged. "Watchtower, this is
Green Arrow, on station." Became the [signal protocol](../watch/signals.md) — six
signals, defined responders, defined windows, no chat.

**Ceremony.** Going on duty and standing down are explicit acts that mean something. This
is culturally native to a community that puts on a costume, and it's why sign-on isn't a
toggle buried in settings.

## What we deliberately left

**Clearance levels and need-to-know (S.H.I.E.L.D.).** Compartmentalised information is
how institutions control people. Watch is a post, not a rank, and there's no tier of
operator who sees more by status.

**Command hierarchy.** The fiction is full of chains of command. This network has none —
whoever holds watch has the board, and when they stand down they don't outrank anyone.

**Secret identity as a plot device.** Pseudonymity here is a safety property with real
consequences, not a source of drama. Nothing in the product should treat an operator's
privacy as a mystery to be resolved.

**Surveillance as care.** Fictional organisations routinely watch their people without
consent and it's framed as protective. Every visibility feature here is opt-in, and an
operator running Ghost is a full participant.

## The method, for whoever comes next

When a design question comes up, the useful move is usually **not** "how does the market
solve this." It's "how would an organisation solve this if it were built to work rather
than to sell."

That question produced a volunteer duty roster, an asymmetric two-app architecture, a
signal protocol, and directory-lookup-by-proxy. None of those are in a product you could
buy, and all of them are obvious once you're looking at the problem through the right
lens.

The failure mode to watch for is the reverse: someone "fixing" the watch into a
notification system, or the board into a feed, because that's what comparable software
does. That would be the market reasserting itself, and it should be resisted on sight.
