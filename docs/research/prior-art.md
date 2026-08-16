# Prior Art & Closed Paths

What already exists, what we deliberately are not rebuilding, and which technical
directions were explored and shelved. Kept so the work isn't redone.

---

## In the outreach space

**[Herocore](https://www.herocore.online/)** — Community hub where members post patrol
logs, plus a map of active and inactive individuals and groups.
→ *Relevant because it proves patrol logging is an established behavior.* It captures
the patrol **after the fact**, on a forum. Nothing serves the during. NavCom should
complement it and export to it, never compete with it.

**[mutualaid.fun](https://mutualaid.fun/)** — Intake, outreach, check-in and
distribution for mutual aid. Runs on your own devices, works offline, data stays with
the people doing the work, volunteers join by scanning a QR code.
→ *Different community, but it validates our exact interaction pattern.* Worth studying
closely before designing anything.

**211 and official directories** — The incumbent, and the reason this project exists.
Listings rot, hours are wrong, and intake rules (pets, sobriety, ID, curfew) are usually
absent entirely.

**Discord / Signal** — What teams already use for coordination, and it works.
→ *This is why team chat and op scheduling were cut.* Complementing their existing tool
removes the largest adoption barrier.

---

## The TAK ecosystem — explored, not adopted

NavCom was at one point scoped as an ATAK-class tactical platform. That was abandoned
after the archetype run; recorded here so the reasoning survives.

**This is also where the name comes from.** The original framing was "decentralized
off-grid field operations communications" — NavCom, navigation *and* communications.
The archetype run cut every communications feature, so only the navigation half
survived. The name stayed; the "Com" no longer means anything. Treat any older
description of NavCom as a comms platform as stale.

| Product | Notes |
|---|---|
| **ATAK-CIV** | Open source, mature, huge plugin ecosystem. Android only. Brutal learning curve |
| **iTAK / TAK Aware** | iOS, oriented to civilian first responders, reduced feature set |
| **TAK Tracker** (official) | Send-only, **no map at all**. Battery efficient, very limited |
| **OpenTAK Tracker** | Position-only ingest into TAK |
| **TAK Server** | Provides reach beyond LAN, PKI enrollment, data sync, federation |

**Key finding: ATAK already works without a server.** ATAK and WinTAK default to UDP
multicast Mesh SA on `239.2.3.1:6969` — two clients on the same LAN see each other with
no server, no plugin, no configuration. TAK Server exists to extend reach *beyond* the
LAN, plus certs and data sync.

**Why we're not building here:** every TAK client is a trained-operator tool, and our
users are not trained operators. More decisively, the archetype run cut every feature
that would have justified TAK-class architecture.

### CoT reference (if ever needed)

- **Cursor on Target** is the interoperability standard across ATAK, WinTAK, iTAK and
  hundreds of tactical apps. MITRE / US Air Force origin.
- Framing: magic `0xbf` + version byte + magic `0xbf` + payload. Version `0x00` = XML,
  `0x01` = protobuf ("TAK Protocol v1").
- Sizes: XML position update ≈ 400 bytes; protobuf ≈ 150 bytes.
- PLI intervals configurable 30 s – 30 min, default 5 min.
- **[PyTAK](https://pytak.readthedocs.io/)** — pure-Python asyncio library explicitly for
  building TAK clients, servers and **gateways**. TCP, TLS, UDP unicast/multicast/
  broadcast, WebSockets, XML and protobuf.

---

## Shelved: the CoT ↔ Nostr bridge

**Status: valid, unbuilt, dormant. Revisit only if ATAK enters our world.**

The idea: a userspace process that listens on Mesh SA multicast, republishes CoT to
Nostr relays (encrypted, ephemeral event kinds), subscribes, and re-injects into local
multicast. ATAK is unmodified and thinks it's on a very large LAN.

- **No ATAK plugin required** — no Android work, no SDK registration, no plugin signing.
- **Bandwidth is a non-issue.** 20 operators at 30 s intervals ≈ 0.67 events/s, ~270 B/s.
  Even 100 operators is ~1.3 KB/s.
- **No prior art found** for CoT over Nostr, as of Aug 2026.

**What it would actually buy:** no static IP, no port forwarding, no VPS, no certificate
enrollment — which is the single biggest ATAK administrative pain. Accurate framing is
*"TAK without a dedicated server or PKI"*, not "serverless."

**Unresolved risks:** Nostr events are public and stored by default — naive
implementation publishes team movement permanently. Requires encryption plus ephemeral
kinds (20000–29999), and even then leaks traffic-analysis metadata. Delivery is
best-effort, which is fine for position updates and unacceptable for emergencies.

---

## Cryptography — why PQC was deprioritized

Recorded because "we should use post-quantum crypto" will come back.

**Nostr's native encryption is explicitly unsuitable for high-risk use — by its own
spec.** [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) states it
provides *no forward secrecy* ("when a key is compromised, it is possible to decrypt all
previous conversations"), *no post-compromise security*, *no post-quantum security*, and
*no deniability*. The conversation key is static per pair.

**The upgrade path exists but isn't PQ yet.**
[Marmot](https://github.com/marmot-protocol/marmot) (MLS over Nostr) provides forward
secrecy and post-compromise security today, with an
[audited Rust implementation](https://leastauthority.com/blog/audit-of-white-noise-whitenoise-rs/).
PQ ciphersuites are anticipated, not shipped.

**Available PQ libraries are unaudited.** `ts-mls` supports ML-KEM and X-Wing but states
plainly it has had no formal security audit; `@noble/post-quantum` was self-audited as of
v0.6.1 (Apr 2026). Do not put unaudited cryptography on a security boundary protecting
people at risk.

**Why it's moot for NavCom:** Tier A holds no interpersonal secrets. The realistic threat
is doxxing, stalking and harassment — so **pseudonymity is the security product**. No
real names, no phone numbers, no email, no recoverable social graph, no central database.
Spending the security budget on cipher strength instead of metadata hygiene would be
impressive and misdirected.

---

## Off-grid — surveyed, deferred

- **Meshtastic** — X25519 + AES-CCM. Docs state plainly that PQ key exchange doesn't fit
  in LoRa packets, so it's explicitly harvest-now-decrypt-later. 237-byte packet cap.
  Ships an [official ATAK plugin](https://github.com/meshtastic/ATAK-Plugin).
- **Reticulum / LXMF** — X25519 + Ed25519, genuinely delay- and disruption-tolerant with
  store-and-forward propagation nodes. Runs over LoRa, packet radio, serial, AX.25.

**Deferred because** urban outreach has cell coverage, and no archetype asked for mesh.
"Offline" for our users means *cached data with no signal*, which a service worker
solves. Revisit only if a real user hits a real gap.

Design note if it ever returns: keep E2EE **above** the transport, and the weak crypto in
both stacks becomes irrelevant — they're just bearers.
