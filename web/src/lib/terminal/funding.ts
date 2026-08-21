/**
 * A Lightning address, and nothing else.
 *
 * An operator working under a persona cannot accept PayPal or GoFundMe without exposing a
 * legal name — to the platform, and usually to donors. That is a hard block on funding the
 * people doing this work, and *"the person doing the most is often the one who can least
 * afford it"*.
 *
 * **This app never touches money.** No custody, no keys, no amounts, no payment handling, no
 * wallet. It stores and displays a string, so a seized phone yields an address rather than a
 * financial trail — and NavCom can never help with a payment problem, because it never sees
 * one.
 *
 * ## No totals, anywhere, ever
 *
 * Not on a card, not aggregated, not "top supported". Money is a stronger status signal than
 * any badge, and a visible total would rebuild the leaderboard this project deliberately
 * refused — attracting exactly the personality this community distrusts. An operator sees
 * their balance in their own wallet. There is nothing here to show it.
 *
 * NIP-57 zaps are declined for the same reason: zap receipts exist mainly to make zaps
 * publicly countable, so the complex half of that spec serves the half we do not want.
 *
 * Accruing tier, and outside every visibility preset — the operator who most needs support
 * may be the one who most needs to stay invisible, and bundling them would force a trade
 * that does not exist.
 */

import { isLightningAddress } from '@navcom/core';
import { clearField, get, set } from './storage';

const MINE = 'lightning';
const SQUAD = 'lightning_squad';

export class FundingError extends Error {}

/** The operator's own address, or null. */
export const address = (): string | null => get<string>('accruing', MINE);

/**
 * A crew-level address for shared supplies, kept separate from anybody's own.
 *
 * Probably how supplies actually get bought, and it sidesteps personal incentive entirely —
 * money for socks arriving somewhere that is nobody's is a different thing from money
 * arriving at a person.
 */
export const squadAddress = (): string | null => get<string>('accruing', SQUAD);

function save(field: string, value: string): void {
  const clean = value.trim().toLowerCase();
  if (!clean) {
    clearField('accruing', field);
    return;
  }
  if (!isLightningAddress(clean)) {
    throw new FundingError('That is not a Lightning address — they look like name@wallet.com.');
  }
  set('accruing', field, clean);
}

export const setAddress = (value: string): void => save(MINE, value);
export const setSquadAddress = (value: string): void => save(SQUAD, value);
