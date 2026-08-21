/**
 * Whether this phone is still able to save.
 *
 * A write failure is the one error that is invisible by construction: nothing throws, the
 * screen does exactly what it was going to do, and the operator finds out later by looking
 * for something that is not there. Patrols, standing, a peer just paired — all of it.
 *
 * So it is reported where it happens rather than where somebody thinks to look. The banner
 * lives in the terminal layout and therefore appears on **every** screen, including the ones
 * that write without checking, which is all of them.
 */

import { onStorageError, storageError } from './storage';

class Saving {
  /** The failure, in the operator's terms, or null while writes are landing. */
  failure = $state<string | null>(null);
  #stop: (() => void) | null = null;

  start(): void {
    if (this.#stop) return;
    // A failure may already have happened before this screen mounted.
    this.failure = storageError();
    this.#stop = onStorageError((message) => {
      this.failure = message;
    });
  }

  stop(): void {
    this.#stop?.();
    this.#stop = null;
  }
}

export const saving = new Saving();
