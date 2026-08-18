#!/usr/bin/env node
import { loadDaemonConfig } from "./config.js";
import { loadOrCreateKeypair } from "../shared/identity.js";
import { WatchtowerDaemon } from "./watchtower.js";

// Found in review: nothing guarded against a truly unexpected error
// outside the known try/catch paths inside WatchtowerDaemon. Node's own
// default behavior for an uncaught exception is to print to stderr and
// exit anyway, but relying on the default here means a crash trace could
// get lost depending on how the process is supervised/redirected, and
// carries no indication it came from this daemon specifically. For a
// safety-coordination system, silently losing watch coverage with zero
// trace of why is the worst-case failure mode -- these handlers make
// sure SOMETHING legible is logged before the process goes down, using
// the same [daemon] prefix convention as every other log line here.
process.on("uncaughtException", (err: unknown) => {
  console.error(`[daemon] uncaught exception: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason: unknown) => {
  console.error(`[daemon] unhandled rejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`);
  process.exit(1);
});

function configPath(): string {
  return process.argv[2] || process.env.WATCHTOWER_CONFIG || "./watchtower.toml";
}

async function main(): Promise<void> {
  const path = configPath();
  const config = loadDaemonConfig(path);
  const { secretKey, pubkey } = loadOrCreateKeypair(config.identity.privkeyPath);

  console.log(`[daemon] Watchtower pubkey: ${pubkey}`);
  console.log(`[daemon] relays: ${config.relays.urls.join(", ")}`);
  console.log(
    `[daemon] watch: routine_default=${config.watch.routineIntervalDefault}s ` +
      `overdue_grace=${config.watch.overdueGrace}s hard_expiry=${config.watch.hardExpiry}s`,
  );

  const daemon = new WatchtowerDaemon({ config, secretKey, pubkey });
  await daemon.start();
  console.log("[daemon] published watch state (automated). Listening for signals.");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[daemon] received ${signal}, shutting down (board is memory-only, nothing to flush)`);
    daemon
      .stop()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error(`[daemon] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
