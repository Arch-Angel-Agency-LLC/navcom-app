#!/usr/bin/env node
import { loadEscalationConfig } from "./config.js";
import { loadOrCreateKeypair } from "../shared/identity.js";
import { EscalationExecutor } from "./executor.js";

/**
 * The escalation executor, as its own process.
 *
 * Run it separately from the daemon, and supervise it separately. If they share a
 * supervisor unit, a crash loop in one restarts the other, and "separate failure domains"
 * becomes a comment rather than a property.
 *
 *   navcom-escalation /etc/navcom/escalation.toml
 */

process.on("uncaughtException", (err: unknown) => {
  console.error(`[executor] uncaught exception: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason: unknown) => {
  console.error(`[executor] unhandled rejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`);
  process.exit(1);
});

function configPath(): string {
  return process.argv[2] || process.env.NAVCOM_ESCALATION_CONFIG || "./escalation.toml";
}

function main(): void {
  const path = configPath();
  const config = loadEscalationConfig(path);
  const { secretKey, pubkey } = loadOrCreateKeypair(config.identity.privkeyPath);

  const roster = config.escalation.oncall;
  const wakeable = roster.filter((e) => e.declaration.channel !== "console-open");

  console.log(`[executor] Watchtower pubkey: ${pubkey}`);
  console.log(`[executor] relays: ${config.relays.urls.join(", ")}`);
  console.log(
    `[executor] windows: paging=${config.escalation.pagingWindowSeconds}s ` +
      `contact=${config.escalation.contactWindowSeconds}s`,
  );

  // By name, never as a total -- and the empty case is stated rather than left to inference.
  if (wakeable.length === 0) {
    console.warn("[executor] ####################################################");
    console.warn("[executor] NOBODY IS ON-CALL. A Distress will page nobody, reach");
    console.warn("[executor] EXHAUSTED immediately, and tell the operator so.");
    console.warn("[executor] That is the ladder working. It is not the ladder helping.");
    console.warn("[executor] ####################################################");
  } else {
    console.log(`[executor] on-call: ${wakeable.map((e) => `${e.declaration.author.callsign} (${e.declaration.channel})`).join(", ")}`);
  }

  const executor = new EscalationExecutor({ config, secretKey, pubkey });
  executor.start();
  console.log("[executor] listening for 20911. The agent is not in this path.");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    // Live ladders are lost on restart, and that is stated rather than hidden: a client
    // retrying its Distress will start a fresh one within seconds, which is the behaviour
    // the indefinite-retry requirement exists to produce.
    const live = executor.ladders.all().filter((l) => l.state === "paging" || l.state === "contact");
    if (live.length > 0) {
      console.warn(`[executor] shutting down with ${live.length} ladder(s) still running`);
    }
    console.log(`[executor] received ${signal}, shutting down`);
    executor.stop().then(() => process.exit(0), () => process.exit(1));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
