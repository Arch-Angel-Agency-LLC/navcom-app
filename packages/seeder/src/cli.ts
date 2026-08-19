#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDirectoryOrThrow } from "@navcom/core";
import { audit } from "./audit.js";
import { dedupe } from "./dedupe.js";
import { toCsv } from "./emit.js";
import { merge } from "./merge.js";
import { normalise } from "./normalise.js";
import { fetchOsm, type OsmConfig } from "./sources/osm.js";
import type { RawRecord, SeededRecord } from "./seeded.js";

/**
 * Five commands, each doing one thing.
 *
 *   fetch  -- the ONLY command that touches a network
 *   build  -- cache to proposed CSV. Pure, offline, deterministic, free
 *   diff   -- what would change, against what is committed
 *   apply  -- write it
 *   audit  -- check committed data against the rules
 *
 * `fetch` and `build` are separate so normalisation can be iterated a hundred times without
 * hitting a shelter's website once. Politeness and speed want the same thing here.
 *
 * Every command writes machine-readable JSON. An agent should never parse a log line.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CONTACT = process.env["NAVCOM_SEED_CONTACT"] ?? "https://navcom.app";
const USER_AGENT = "navcom-seeder/0.1 (+" + CONTACT + ")";

interface RegionManifest {
  slug?: string;
  country?: string;
  sources?: { osm?: OsmConfig };
}

interface SourceReport {
  name: string;
  ok: boolean;
  records: number;
  ms: number;
  error?: string;
}

interface Report {
  region: string;
  command: string;
  at: string;
  sources?: SourceReport[];
  proposed?: { added: number; changed: number; unchanged: number; protected: number };
  merged?: { kept: string; dropped: string; reason: string }[];
  review?: { id: string; name: string; reason: string }[];
  findings?: { id: string; problem: string }[];
  /** Source categories with no home in the taxonomy. A question for a human, not an error. */
  unmapped?: { category: string; count: number }[];
}

const regionDir = (slug: string) => join(ROOT, "data", "regions", slug);
const cacheDir = (slug: string) => join(regionDir(slug), ".cache");
const reportPath = (slug: string) => join(regionDir(slug), ".seed-report.json");
const csvPath = (slug: string) => join(regionDir(slug), "resources.csv");
const proposedPath = (slug: string) => join(cacheDir(slug), "proposed.csv");

function manifest(slug: string): RegionManifest {
  const p = join(regionDir(slug), "region.json");
  if (!existsSync(p)) throw new Error("No region at " + p);
  return JSON.parse(readFileSync(p, "utf8")) as RegionManifest;
}

function write(slug: string, report: Report): Report {
  mkdirSync(cacheDir(slug), { recursive: true });
  writeFileSync(reportPath(slug), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function committedRecords(slug: string) {
  return existsSync(csvPath(slug)) ? parseDirectoryOrThrow(readFileSync(csvPath(slug), "utf8")) : [];
}

/** Cached raw responses. Re-running must not re-hit anyone's server. */
function cachedRaw(slug: string): Record<string, RawRecord[]> {
  const p = join(cacheDir(slug), "raw.json");
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, RawRecord[]>) : {};
}

async function cmdFetch(slug: string, only?: string): Promise<void> {
  const region = manifest(slug);
  const raw = cachedRaw(slug);
  const sources: SourceReport[] = [];

  // Each source is independent. One returning 403 must leave the others intact and say
  // which one broke -- a run that silently produces half a region is worse than one that
  // stops, and worse still than one that says so.
  if (region.sources?.osm && (!only || only === "osm")) {
    const started = Date.now();
    try {
      const records = await fetchOsm(region.sources.osm, USER_AGENT);
      raw["osm"] = records;
      sources.push({ name: "osm", ok: true, records: records.length, ms: Date.now() - started });
    } catch (err: unknown) {
      sources.push({
        name: "osm", ok: false, records: 0, ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  mkdirSync(cacheDir(slug), { recursive: true });
  writeFileSync(join(cacheDir(slug), "raw.json"), JSON.stringify(raw, null, 2) + "\n");
  write(slug, { region: slug, command: "fetch", at: new Date().toISOString(), sources });
}

function cmdBuild(slug: string): Report {
  const region = manifest(slug);
  const raw = cachedRaw(slug);
  const country = region.country ?? "US";

  // Order is trust order: whichever record is seen first wins a merge.
  const flat = Object.values(raw).flat();
  const normalised: SeededRecord[] = [];
  const urls = new Map<string, string>();
  // Categories nothing could be done with. Reported by name and count, so the person who
  // owns the taxonomy can see what is being left out and decide whether to extend it.
  const unmapped = new Map<string, number>();

  for (const r of flat) {
    const one = normalise(slug, r, country);
    if (!one) {
      const key = r.category ?? "(none)";
      unmapped.set(key, (unmapped.get(key) ?? 0) + 1);
      continue;
    }
    normalised.push(one);
    if (r.url) urls.set(one.id, r.url);
  }

  const { records, merged } = dedupe(normalised);
  const today = new Date().toISOString().slice(0, 10);
  const result = merge(committedRecords(slug), records, today, urls, slug);

  mkdirSync(cacheDir(slug), { recursive: true });
  writeFileSync(proposedPath(slug), toCsv(result.records));

  return write(slug, {
    region: slug, command: "build", at: new Date().toISOString(),
    proposed: {
      added: result.added, changed: result.changed,
      unchanged: result.unchanged, protected: result.protected,
    },
    merged, review: result.review,
    unmapped: [...unmapped.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  });
}

function cmdApply(slug: string): void {
  if (!existsSync(proposedPath(slug))) throw new Error("Nothing built. Run `build` first.");
  const proposed = readFileSync(proposedPath(slug), "utf8");
  // Parsed before writing: a proposal that will not load is not written over real data.
  const records = parseDirectoryOrThrow(proposed);
  const findings = audit(records, slug);
  if (findings.length > 0) {
    write(slug, { region: slug, command: "apply", at: new Date().toISOString(), findings });
    throw new Error("Refused: " + findings.length + " audit finding(s). Nothing written.");
  }
  writeFileSync(csvPath(slug), proposed);
  write(slug, { region: slug, command: "apply", at: new Date().toISOString(), findings: [] });
}

function cmdAudit(slug: string): void {
  const findings = audit(committedRecords(slug), slug);
  write(slug, { region: slug, command: "audit", at: new Date().toISOString(), findings });
  if (findings.length > 0) process.exit(1);
}

async function main(): Promise<void> {
  const [command, slug, ...rest] = process.argv.slice(2);
  if (!command || !slug) {
    console.error("usage: navcom-seed <fetch|build|diff|apply|audit> <region> [--source osm]");
    process.exit(2);
  }
  const only = rest.find((a) => a.startsWith("--source="))?.split("=")[1];

  switch (command) {
    case "fetch": await cmdFetch(slug, only); break;
    // `diff` is `build` without applying -- the report IS the diff, and building twice is
    // free and deterministic, so there is nothing to gain from a separate code path.
    case "diff":
    case "build": cmdBuild(slug); break;
    case "apply": cmdApply(slug); break;
    case "audit": cmdAudit(slug); break;
    default:
      console.error("Unknown command: " + command);
      process.exit(2);
  }
}

main().catch((err: unknown) => {
  console.error("[seed] " + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
