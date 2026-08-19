import { execFile } from "node:child_process";
import type { OnCallEntry } from "./config.js";

/**
 * Waking people up.
 *
 * No SMS or push provider is embedded here on purpose. Every operator running a box already
 * has some way to reach their people -- a gateway, a bot, a script -- and hard-coding one
 * would put a third party in the escalation path, which is the one path that must not
 * depend on anybody's uptime but the node operator's own.
 *
 * So a channel names WHAT was registered and the command says HOW it is delivered. The wire
 * format keeps the spec's channel vocabulary; the node keeps the mechanism.
 */

export interface PageResult {
  callsign: string;
  channel: string;
  /** Whether the command exited zero. **Not** whether a human woke up. */
  dispatched: boolean;
  error?: string;
}

/** Per-argument substitution. Never a shell string, so a payload cannot become a command. */
function fill(argv: string[], vars: Record<string, string>): string[] {
  return argv.map((arg) =>
    arg.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => vars[key] ?? whole),
  );
}

function run(argv: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = argv;
    execFile(cmd!, args, { timeout: timeoutMs }, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Pages everyone at once.
 *
 * **Parallel, not serial** -- in an emergency you want everyone, and walking a roster in
 * order spends the only resource that matters. One channel failing must never stop the
 * others being tried, which is why this settles rather than races.
 *
 * A successful dispatch means a command exited zero. It does **not** mean anyone woke up,
 * and nothing in this file may ever be treated as an acknowledgement: only an explicit
 * `distress-ack` from a human stops the ladder.
 */
export async function pageAll(
  roster: OnCallEntry[],
  message: string,
  timeoutMs = 30_000,
): Promise<PageResult[]> {
  const wakeable = roster.filter((e) => e.declaration.channel !== "console-open");

  const settled = await Promise.allSettled(
    wakeable.map((entry) =>
      run(
        fill(entry.command, {
          message,
          callsign: entry.declaration.author.callsign ?? "",
        }),
        timeoutMs,
      ),
    ),
  );

  return settled.map((outcome, i) => {
    const entry = wakeable[i]!;
    const base = {
      callsign: entry.declaration.author.callsign ?? "unnamed",
      channel: entry.declaration.channel,
    };
    return outcome.status === "fulfilled"
      ? { ...base, dispatched: true }
      : { ...base, dispatched: false, error: String(outcome.reason) };
  });
}
