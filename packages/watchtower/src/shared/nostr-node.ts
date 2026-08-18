import { useWebSocketImplementation } from "nostr-tools/pool";
import WebSocket from "ws";

let installed = false;

/**
 * nostr-tools' relay/pool code expects a global WebSocket (browser-native
 * there); Node has no such global, so this wires the `ws` package in
 * once per process. Both the daemon and the CLI client call this before
 * constructing a SimplePool.
 */
export function installNodeWebSocket(): void {
  if (installed) return;
  useWebSocketImplementation(WebSocket as unknown as typeof globalThis.WebSocket);
  installed = true;
}
