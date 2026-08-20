# Funding

Operators buy supplies out of pocket. This is about making support possible without
costing them their persona — which is pseudonymity, not anonymity, and the distinction is
load-bearing here: a callsign that receives support is linkable across everything it
signs, and that is exactly what makes the support attributable.

## The capability that matters

**Pseudonymous receipt.** An operator working under a persona cannot accept PayPal,
Venmo or GoFundMe without exposing their legal name — to the platform, and usually to
donors. That's a hard block on funding the people doing this work.

Lightning removes it. Support arrives addressed to a callsign.

This is real as of 2026: several custodial wallets require no KYC to receive, Phoenix
offers self-custody with automatic channel handling, Alby Hub runs a self-custodial node
that doubles as a Lightning address, and self-hosting an address is possible.

## What we build: an address field, not zap infrastructure

Optional `lightning_address` on the persona. Rendered as a QR and a copyable string on
the operator's card, and on the [op recap](./propagation.md) if they've enabled one.

**The app never touches money.** No custody, no keys, no amounts, no payment handling,
no wallet integration. It stores and displays a string.

**Why not NIP-57 zaps.** Zap receipts (kind 9735) exist mainly to make zaps publicly
countable — which is exactly the feature we refuse (see rule 2). The complex half of the
spec serves the half we don't want. An address field delivers the capability at a
fraction of the surface area and a fraction of the support burden.

## Rules

**1. Opt-in, off by default.** Independent of visibility presets, available in Ghost.

**2. No totals, counts, or rankings. Anywhere. Ever.** Not on cards, not on recaps, not
aggregated, not "top supported." Money is a stronger status signal than any badge, and
visible totals would rebuild the leaderboard we deliberately refused — attracting exactly
the personality this community distrusts. An operator sees their balance in their own
wallet app; NavCom shows nothing.

**3. External wallet only.** The app holds an address. A seized phone yields a string,
not a financial trail.

**4. One honest screen.** Stated plainly before enabling — see below.

**5. Team supply fund is separate.** A crew-level address for shared supplies, distinct
from any individual's. Probably how supplies actually get bought, and it sidesteps
personal incentive entirely.

## What the honest screen says

Operators deserve the real picture before enabling this, not a pitch:

- **Receiving can be pseudonymous. Converting to cash usually isn't.** Identity typically
  re-enters at the off-ramp. If that matters, plan for it before accepting anything.
- **Self-custody means a lost phone can mean lost funds.** Back up the wallet's recovery
  phrase somewhere other than the phone.
- **Value moves.** Bitcoin's price changes; sats received today may buy more or less
  later.
- **Impersonation is possible.** Someone can claim to be you and collect. Endorsements
  make that harder, not impossible.
- **NavCom cannot help with a payment problem.** We never see it. Wallet support is with
  the wallet.

## Never

- Custody of operator funds
- Platform fees, revenue share, or any cut
- Displayed totals, counts, rankings, or supporter lists
- Donation prompts, suggested amounts, or fundraising nudges
- Standing, visibility or features affected by funds received
