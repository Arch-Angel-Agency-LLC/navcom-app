/**
 * Directory data check.
 *
 * Reads data/regions/ off disk and reports what is wrong with it, without needing a build.
 * For someone editing a CSV who wants an answer in a second, and for CI so bad data cannot
 * reach a deploy.
 *
 * Two tiers, and the distinction is the point:
 *
 *   ERRORS   the data is invalid and the build would fail anyway
 *   WARNINGS the data is legal but worth a human looking at
 *
 * The warnings exist because the most dangerous entry is not the malformed one — it is the
 * plausible one. A guessed intake rule parses perfectly.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INTAKE_FIELDS } from '../src/lib/directory/fields';
import { parseDirectory } from '../src/lib/directory/parse';
import { parseRegion } from '../src/lib/directory/region';
import type { ResourceRecord } from '../src/lib/directory/types';

const ROOT = fileURLToPath(new URL('../../data/regions/', import.meta.url));

interface Note { region: string; row: number | null; field: string; message: string }

const errors: Note[] = [];
const warnings: Note[] = [];
const err = (region: string, row: number | null, field: string, message: string) =>
  errors.push({ region, row, field, message });
const warn = (region: string, row: number | null, field: string, message: string) =>
  warnings.push({ region, row, field, message });

if (!existsSync(ROOT)) {
  console.error(`No data/regions/ directory at ${ROOT}`);
  process.exit(1);
}

const slugs = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
  .map((e) => e.name)
  .sort();

const seenIds = new Map<string, string>();
let total = 0;
const today = new Date().toISOString().slice(0, 10);

console.log(`\nChecking ${slugs.length} region(s) in data/regions/\n`);

for (const slug of slugs) {
  const dir = join(ROOT, slug);
  const manifestPath = join(dir, 'region.json');
  const csvPath = join(dir, 'resources.csv');

  if (!existsSync(manifestPath)) { err(slug, null, 'region.json', 'missing'); continue; }
  if (!existsSync(csvPath)) { err(slug, null, 'resources.csv', 'missing'); continue; }

  let region;
  try {
    region = parseRegion(slug, JSON.parse(readFileSync(manifestPath, 'utf8')));
  } catch (e) {
    err(slug, null, 'region.json', (e as Error).message.replace(/^.*region\.json: /, ''));
    continue;
  }

  const { records, issues } = parseDirectory(readFileSync(csvPath, 'utf8'));
  for (const i of issues) err(slug, i.row, i.column, i.message);

  for (const r of records) {
    total++;

    const already = seenIds.get(r.id);
    if (already && already !== slug) {
      err(slug, null, 'id', `"${r.id}" is also used by region "${already}". Ids are global.`);
    }
    seenIds.set(r.id, slug);

    // The seeding rule, mechanically. A published policy may be recorded; an inferred one
    // may not, and nothing in a CSV can tell those apart — so a human confirms.
    if (r.method === 'website' || r.method === 'secondhand') {
      const filled = INTAKE_FIELDS.filter((f) => {
        const v = (r as Record<string, unknown>)[f];
        return Array.isArray(v) ? v.length > 0 : v !== undefined;
      });
      if (filled.length) {
        warn(slug, null, r.id,
          `intake rules recorded at method=${r.method}: ${filled.join(', ')}. ` +
          `Confirm the service published these rather than someone inferring them.`);
      }
    }

    // H3 — a callsign or "anonymous", never a legal name.
    if (r.verified_by && r.verified_by !== 'anonymous' && /\s/.test(r.verified_by)) {
      warn(slug, null, r.id,
        `verified_by "${r.verified_by}" contains a space. This must be a callsign or ` +
        `"anonymous" — never a legal name [H3].`);
    }

    if (r.flag !== 'ok' && !r.notes) {
      warn(slug, null, r.id, `flagged "${r.flag}" with no note saying what is wrong.`);
    }
    if (r.method && !r.last_verified) {
      warn(slug, null, r.id, `method=${r.method} but no last_verified, so it reads as stale.`);
    }
    if (r.last_verified && r.last_verified > today) {
      warn(slug, null, r.id, `last_verified ${r.last_verified} is in the future.`);
    }
  }

  console.log(
    `  ${slug.padEnd(14)} ${region.name} (${region.country})  ` +
    `${region.timezone}  status=${region.status}  ${records.length} record(s)`
  );
}

const show = (label: string, notes: Note[]) => {
  if (!notes.length) return;
  console.log(`\n${label} (${notes.length})`);
  for (const n of notes) {
    const where = n.row !== null ? `row ${n.row}` : n.field;
    console.log(`  ${n.region}  ${where}${n.row !== null ? `, ${n.field}` : ''}`);
    console.log(`    ${n.message}`);
  }
};

show('ERRORS', errors);
show('WARNINGS', warnings);

console.log(
  `\n${total} record(s) across ${slugs.length} region(s). ` +
  `${errors.length} error(s), ${warnings.length} warning(s).\n`
);

process.exit(errors.length ? 1 : 0);
