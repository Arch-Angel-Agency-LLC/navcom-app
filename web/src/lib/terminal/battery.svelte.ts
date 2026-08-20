/**
 * Your own battery, told to you and to nobody else.
 *
 * ## Why it is not published
 *
 * The obvious version puts a battery level on the heartbeat, so a peer or a watch can tell
 * *"their phone died"* from *"something happened"*. That is genuinely useful, and it is the
 * version this file deliberately does not build.
 *
 * Publishing it makes **silence interpretable**, and the inference runs both ways. Somebody
 * who goes quiet at 6% reads as a flat battery — fine. Somebody who goes quiet at 90% reads
 * as *something is wrong*, and that is a conclusion drawn from an absence, by a person, at
 * 2am. Invariant 3 says duress is never inferred from silence; a field that makes silence
 * look alarming is that inference wearing a different hat, and it would push people toward
 * escalating on nothing.
 *
 * `signals.spec.md` already requires the public case to work this way: a phone whose battery
 * died must be indistinguishable from one whose owner went home.
 *
 * ## What it does instead
 *
 * Tells the operator, about their own phone, while they are out. They are the one person who
 * can act on it — say something, head back, find a charger — and they are the only one who
 * can act on it without guessing about somebody else.
 *
 * ## Availability, stated rather than assumed
 *
 * The Battery Status API is Chromium-only. Firefox removed it as a fingerprinting vector and
 * Safari never shipped it, so **this is absent on iOS entirely**. Absent is the correct
 * behaviour: nothing here estimates, and no screen shows a battery reading that is a guess.
 * The device floor is a prepaid Android running Chrome, where it works.
 */

/** Below this, the operator is told. High enough to still be able to do something about it. */
export const LOW_PERCENT = 15;

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

let percent = $state<number | null>(null);
let charging = $state(false);
let source: BatteryLike | null = null;

export const battery = {
  /** Whole percent, or null where this browser does not say — never an estimate. */
  get percent(): number | null {
    return percent;
  },

  get charging(): boolean {
    return charging;
  },

  /**
   * Worth telling the operator about.
   *
   * False while charging, however low: a phone on a charger at 4% is a phone that is fine
   * in ten minutes, and warning about it is the kind of noise that trains people to dismiss
   * warnings.
   */
  get low(): boolean {
    return percent !== null && !charging && percent <= LOW_PERCENT;
  },

  /** Starts reading, where the browser has anything to read. Safe to call repeatedly. */
  async start(): Promise<void> {
    const get = (navigator as unknown as { getBattery?: () => Promise<BatteryLike> }).getBattery;
    if (typeof get !== 'function') return;

    try {
      source = await get.call(navigator);
    } catch {
      // Some browsers expose the function and refuse the call, which is the same outcome as
      // not having it: nothing is known, and nothing is shown.
      return;
    }

    const sync = () => {
      if (!source) return;
      percent = Math.round(source.level * 100);
      charging = source.charging;
    };
    sync();
    source.addEventListener('levelchange', sync);
    source.addEventListener('chargingchange', sync);
  }
};
