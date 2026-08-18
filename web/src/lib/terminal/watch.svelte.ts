/**
 * Watch state, as the terminal sees it.
 *
 * Dark is the starting value and the fallback, never a placeholder: a terminal that has not
 * connected genuinely has no watch, and saying so is the honest answer rather than a
 * holding message.
 */

import { readWatchStateAt, type RootAlarm, type WatchStateRead } from '@navcom/core';
import { loadConfig } from './config';
import { watchWatchtower, type Connection } from './relay';
import { recordRoot, rootAlarms } from './roots';

let read = $state<WatchStateRead>(readWatchStateAt(null));
let connected = $state(false);
let alarms = $state<RootAlarm[]>([]);
let connection: Connection | null = null;

export const watch = {
  get read(): WatchStateRead {
    return read;
  },
  get state() {
    return read.state;
  },
  /** True once a subscription is open — not that a watch exists. */
  get connected(): boolean {
    return connected;
  },

  /**
   * Contradictions this device has seen in what the watch published about its own log.
   *
   * Never cleared. A watch that rewrote history cannot make both of its published roots
   * true, and the operator holding the pair is the only party who can say so.
   */
  get alarms(): RootAlarm[] {
    return alarms;
  },

  /** Starts watching, if this terminal has been given a Watchtower. */
  start(): void {
    const config = loadConfig();
    if (!config) return;
    connection?.close();
    alarms = rootAlarms();
    connection = watchWatchtower(config, (r) => {
      read = r;
      // Only a live read tells us anything about the log. A Dark read means we could not
      // reach the watch, which is not the same as a watch that stopped committing.
      if (!r.dark) {
        recordRoot(r.state.log_root);
        alarms = rootAlarms();
      }
    });
    connected = true;
  },

  stop(): void {
    connection?.close();
    connection = null;
    connected = false;
    read = readWatchStateAt(null);
  }
};
