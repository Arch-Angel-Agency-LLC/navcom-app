# Bootstrap — Spec

Normative. Identity, configuration, and discovery — the things that must exist before a
single signal can be sent.

## The Watchtower keypair

The node holds one secp256k1 keypair. Generated once, stored on the box, never leaves it.

- **Its pubkey is the Watchtower address.** Signals are NIP-44 encrypted to it and
  `p`-tagged to it. The `10910` watch state event is signed by it
- MUST be generated on the node, not on a laptop and copied
- MUST be readable only by the node processes — file permissions, not a secret store, for
  MVP
- **Compromise means the whole board is readable.** There is no key rotation story yet;
  it is a Mk1 requirement, not an MVP one, and it is recorded here so nobody assumes one
  exists

## Operator keypairs

Generated on the operator's device. Never transmitted, never escrowed, never registered.

The node learns an operator's pubkey the first time it receives a signal from them.

## Who may sign on

**MVP: any pubkey.** The first Watchtower is a closed test among people who know each
other, and an allowlist would be ceremony without security.

**Mk1 MUST NOT ship this.** An open board means anyone who learns the Watchtower pubkey
can place entries on it, consume watch attention, and observe the watch state. Mk1 needs
one of:

- An operator allowlist held on the node, or
- An endorsement check — sign-on accepted from pubkeys presenting a valid credential from
  a known endorser

The second is preferred; it reuses [`../product/identity.md`](../product/identity.md)
rather than adding a second trust mechanism. **Flagged as the largest known gap between
MVP and Mk1.**

## Configuration

**Node** (`watchtower.toml` or equivalent):

```toml
[identity]
privkey_path = "/var/lib/navcom/watchtower.key"

[relays]
urls = ["wss://relay.example", "wss://relay2.example"]

[watch]
routine_interval_default = 3600
overdue_grace = 1800
hard_expiry = 14400

[escalation]
page_window = 300
contact_window = 300

[oncall]
# operators reachable when the board can't raise anyone
# a channel is a condition of the role — see opt-ins.md
```

**Client**:

```toml
[identity]
privkey_path = "..."          # device-local

[watchtower]
pubkey = "hex"
relays = ["wss://..."]
```

All timing values *configurable*, defaults per
[`watch-state.spec.md`](./watch-state.spec.md).

## Discovery

**MVP:** the operator is handed the Watchtower pubkey and relay list out of band, and puts
them in a config file. That is honest for a closed test.

**Mk1:** join by QR — a scanned code carrying pubkey and relays, exchanged in person. This
is the same in-person trust path propagation already relies on, so it adds no new
mechanism. See [`../product/propagation.md`](../product/propagation.md).

Nothing auto-discovers a Watchtower. There is no directory of nodes, and there should not
be one — a list of Watchtowers is a list of where operators are.

## Relay selection

**MVP: public relays.** Zero operational burden, works immediately, and self-hosting
before the loop is proven is infrastructure built on a guess.

Accept the tradeoff knowingly: relay operators see that a pubkey published an ephemeral
event of a given kind, when, and how large. They do not see contents. This is the
metadata exposure noted in [`../principles.md`](../principles.md).

**Mk1: self-hosted RelayNode**, which removes third-party metadata exposure and brings
retention policy under Watchtower control.

## What the node MUST NOT do

- Persist board state to disk [C27]
- Log positions, areas, or query text in the accountability log
- Accept an unsigned or badly-signed event
- Publish anything about an operator to a relay other than the `20912` addressed to them
