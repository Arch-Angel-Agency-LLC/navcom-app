/**
 * Watch state, as the terminal sees it.
 *
 * Dark is the starting value and the fallback, never a placeholder: a terminal that has not
 * connected genuinely has no watch, and saying so is the honest answer rather than a
 * holding message.
 */

import { readWatchStateAt, type WatchStateRead } from '@navcom/core';
import { loadConfig } from './config';
import { watchWatchtower, type Connection } from './relay';

let read = $state<WatchStateRead>(readWatchStateAt(null));
let connected = $state(false);
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

  /** Starts watching, if this terminal has been given a Watchtower. */
  start(): void {
    const config = loadConfig();
    if (!config) return;
    connection?.close();
    connection = watchWatchtower(config, (r) => {
      read = r;
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
