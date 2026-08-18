/**
 * Device storage, in two tiers with opposite retention rules.
 *
 * **Accruing** — identity, standing, contributions. Losing it is the failure.
 * **Wipeable** — tonight's data. Retaining it is the failure.
 *
 * That split is not a nicety, it is what makes panic wipe meaningful: an operator under
 * duress should lose the evening and keep the decade. Two keys rather than one, so a wipe
 * cannot take the wrong half by accident.
 *
 * Honest limits, since a browser is what we have:
 *
 * - There is no OS keystore here. The secret sits in localStorage, readable by any script
 *   that runs on this origin. A native shell would do better, and that is one of the two
 *   things listed as justifying one
 * - `localStorage.removeItem` is not a secure erase. It unlinks; it does not scrub the
 *   underlying pages
 *
 * Both are stated rather than implied, because an operator who believes a wipe is total is
 * worse off than one who knows the boundary.
 */

const ACCRUING = 'navcom.accruing';
const WIPEABLE = 'navcom.wipeable';

type Tier = 'accruing' | 'wipeable';
const keyFor = (tier: Tier) => (tier === 'accruing' ? ACCRUING : WIPEABLE);

function read(tier: Tier): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(keyFor(tier)) ?? '{}') as Record<string, unknown>;
  } catch {
    // Corrupt storage reads as empty rather than throwing. A terminal that will not start
    // because of a bad key is worse than one that asks to be set up again.
    return {};
  }
}

function write(tier: Tier, data: Record<string, unknown>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(keyFor(tier), JSON.stringify(data));
}

export function get<T>(tier: Tier, field: string): T | null {
  const v = read(tier)[field];
  return v === undefined ? null : (v as T);
}

export function set(tier: Tier, field: string, value: unknown): void {
  const data = read(tier);
  data[field] = value;
  write(tier, data);
}

export function clearField(tier: Tier, field: string): void {
  const data = read(tier);
  delete data[field];
  write(tier, data);
}

/**
 * Destroys tonight and preserves the decade.
 *
 * Identity, standing and the Watchtower you belong to all survive — an operator who wipes
 * on a bad night should not have to find a person and be re-provisioned before they can
 * work again.
 */
export function panicWipe(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(WIPEABLE);
}

/**
 * Destroys everything on this device, including identity.
 *
 * Deliberate, harder to reach, and irreversible — there is no recovery unless the operator
 * set one up. Meant for compulsion or seizure with intent, not for a phone that might be
 * glanced at.
 */
export function burn(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(WIPEABLE);
  localStorage.removeItem(ACCRUING);
}

/** What a wipe would actually remove, so the operator can be told before it happens. */
export function tierSummary(): { accruing: string[]; wipeable: string[] } {
  return { accruing: Object.keys(read('accruing')), wipeable: Object.keys(read('wipeable')) };
}
