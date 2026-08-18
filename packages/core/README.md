# @navcom/core

Attestations, keys, wire format and the board. **One implementation, shared by the node and
every client.**

The reason is not tidiness. Three surfaces — web, Android, iOS — plus the node speak the
same payloads. Written once, a change is one edit; written per client, it is four, and they
drift. Drift in this particular logic produces a confident wrong answer at 10pm, which is
the failure the whole system is shaped to prevent.

```
attestation.ts        the primitive — claim, author, method, derived weight
crypto/keys.ts        secp256k1. Generated where it will live, never transmitted
crypto/envelope.ts    NIP-44, sealed to the Watchtower key rather than to a person
events/kinds.ts       10910 · 20910 · 20911 · 20912
events/watch-state.ts what may honestly be published, which is not a straight copy
events/signal.ts      the six signals, and distress on its own kind
events/response.ts    every signal gets one. Silence is never an answer
board.ts              Live tier, in memory, never stored
directory/            places, staleness, confidence, display rules
```

## Rules that live in code here, not only in prose

**A watch state cannot advertise a capability it does not have.** `publishableWatchState`
demotes `automated-oncall` to `automated` when nobody is pageable right now, or when no
drill has passed — because the on-call claim is exactly what a drill tests. `station` is
never demoted: a human is genuinely present regardless.

**Hard expiry can never drop a distress entry.** A forgotten sign-on is cleaned up; someone
in trouble is not. The board expires, it does not lose people.

**Absence is Dark.** A missing `10910` reads as Dark, not as an error and not as unknown.

**An answer without provenance renders unverified.** Not a plain answer missing a badge.

**Weight is derived from method and age, never asserted by the author.** Which is also why
an agent's account of its own status grants it nothing.

## Platform-neutral

Nothing here touches a filesystem, a network, or a clock it did not receive as an argument.
Loading a key from disk is the node's job; `import.meta.glob` stays in the web app. That is
what lets the same code run in a browser, on the Jetson, and eventually in a native shell.

## Cryptography

NIP-44 comes from `nostr-tools` — the reference implementation. This project does not ship
its own cryptography on a boundary protecting people at risk.

```sh
npm install && npm test    # 88 tests
```
