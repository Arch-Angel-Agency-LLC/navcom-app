#!/usr/bin/env node
import { SimplePool } from "nostr-tools/pool";
import type { Event } from "nostr-tools/core";
import { KIND_CORRECTION, readCorrection, type Correction } from "@navcom/core";

/**
 * Collecting live corrections so a person can promote the good ones.
 *
 * Milestone 6.8 is deliberately human: somebody reads what operators reported and writes the
 * good ones into the CSV. A public artifact anybody can rewrite is not one anybody can rely
 * on, and that bottleneck is the point.
 *
 * **But a bottleneck that takes an evening does not happen.** This is the difference between
 * "minutes a week" and "I will do it at the weekend" — it fetches, groups and prints what is
 * waiting, and gets out of the way.
 *
 * It deliberately does **not** write to the CSV. Reviewing is the job; a tool that applied
 * corrections automatically would have quietly removed the human this milestone is built
 * around, and the reviewer would find out by reading a shelter's hours they never approved.
 *
 *   navcom-promote --relays wss://relay.damus.io,wss://nos.lol --since 7
 */

interface Options {
  relays: string[];
  sinceDays: number;
  json: boolean;
}

function parse(argv: string[]): Options {
  const at = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const relays = (at("--relays") ?? "wss://relay.damus.io,wss://nos.lol")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return {
    relays,
    sinceDays: Number(at("--since") ?? 30),
    json: argv.includes("--json"),
  };
}

/** Latest word per author per record. An operator's newer correction replaces their older. */
export function latestPerAuthor(
  corrections: readonly (Correction & { by: string })[],
): (Correction & { by: string })[] {
  const best = new Map<string, Correction & { by: string }>();
  for (const c of corrections) {
    const key = `${c.by}:${c.record}`;
    const held = best.get(key);
    if (!held || c.last_verified > held.last_verified) best.set(key, c);
  }
  return [...best.values()];
}

/**
 * Groups by record, so a reviewer reads a place rather than a stream.
 *
 * Sorted by how much is waiting: a shelter three people corrected is more likely to have
 * actually changed than one somebody mentioned once.
 */
export function byRecord(
  corrections: readonly (Correction & { by: string })[],
): { record: string; corrections: (Correction & { by: string })[] }[] {
  const groups = new Map<string, (Correction & { by: string })[]>();
  for (const c of corrections) {
    const held = groups.get(c.record) ?? [];
    held.push(c);
    groups.set(c.record, held);
  }
  return [...groups.entries()]
    .map(([record, cs]) => ({ record, corrections: cs }))
    .sort((a, b) => b.corrections.length - a.corrections.length || a.record.localeCompare(b.record));
}

async function main(): Promise<void> {
  const options = parse(process.argv.slice(2));
  const since = Math.floor(Date.now() / 1000) - options.sinceDays * 86_400;
  const pool = new SimplePool();
  const seen: (Correction & { by: string })[] = [];

  await new Promise<void>((resolve) => {
    const closer = pool.subscribeMany(options.relays, { kinds: [KIND_CORRECTION], since }, {
      onevent: (event: Event) => {
        const read = readCorrection(event);
        if (read) seen.push(read);
      },
      oneose: () => {
        closer.close();
        resolve();
      },
    });
    // Relays that never send end-of-stored-events must not hang a weekly chore.
    setTimeout(() => {
      closer.close();
      resolve();
    }, 15_000);
  });
  pool.destroy();

  const groups = byRecord(latestPerAuthor(seen));

  if (options.json) {
    console.log(JSON.stringify(groups, null, 2));
    return;
  }

  if (groups.length === 0) {
    console.log(`Nothing waiting from the last ${options.sinceDays} days.`);
    return;
  }

  console.log(`${groups.length} record(s) with corrections, most-reported first.\n`);
  for (const { record, corrections } of groups) {
    console.log(`${record}`);
    for (const c of corrections) {
      const fields = Object.entries(c.fields)
        .map(([k, v]) => `${k}=${v}`)
        .join("  ");
      console.log(`  ${c.last_verified}  ${c.verified_by.padEnd(12)} ${c.method.padEnd(16)} ${fields}`);
    }
    console.log("");
  }
  console.log(
    "Nothing here has been written anywhere. Read them, decide, and edit the CSV yourself —\n" +
      "a tool that applied these would have removed the person this step exists for.",
  );
}

// Importable for tests without running the subscription.
if (process.argv[1]?.includes("promote")) {
  main().catch((err: unknown) => {
    console.error(`[promote] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
