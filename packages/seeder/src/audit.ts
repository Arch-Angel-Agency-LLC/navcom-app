import type { ResourceRecord } from "@navcom/core";
import { INTAKE_COLUMNS } from "./emit.js";
import { isHumanVerified, isScraperOwned } from "./merge.js";

/**
 * Checking committed data against the rules, rather than trusting that a run followed them.
 *
 * Runs in CI. The scraper's own types make most of this unreachable, and this exists for
 * the case those types were cast around, edited, or bypassed by somebody editing a CSV by
 * hand -- which is a normal thing for a person with local knowledge to do.
 *
 * Two different rules, and conflating them was a bug the first real run found:
 *
 *  - **Intake rules on any `method: website` row** are wrong whoever typed them. Reading a
 *    shelter's website is not local knowledge, and that is the whole seeding rule
 *  - **`verified_by` on a row the SCRAPER made** is a machine claiming authorship. A person
 *    who typed a row from a website may sign it; "anonymous" is a real author
 */

export interface AuditFinding {
  id: string;
  problem: string;
}

export function audit(records: ResourceRecord[], region = ""): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const seen = new Set<string>();

  for (const r of records) {
    if (seen.has(r.id)) findings.push({ id: r.id, problem: "duplicate id" });
    seen.add(r.id);

    if (isHumanVerified(r)) continue;

    // The one that matters. A seeded row carrying an intake rule is somebody being sent
    // two miles at 11pm on the strength of a guess.
    for (const column of INTAKE_COLUMNS) {
      const value = (r as unknown as Record<string, unknown>)[column];
      const filled = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
      if (filled) {
        findings.push({
          id: r.id,
          problem: 'seeded row has an intake rule set: ' + column + "=" + String(value),
        });
      }
    }

    // Only rows the scraper made. A person who read a shelter's website and typed the row
    // in may sign it -- "anonymous" is a real author. The scraper is not an author and must
    // never claim to be one.
    if (r.verified_by && isScraperOwned(r, region)) {
      findings.push({
        id: r.id,
        problem: 'scraped row claims verified_by="' + r.verified_by + '" -- a scraper verifies nothing',
      });
    }
    if (!r.last_verified) {
      findings.push({ id: r.id, problem: "seeded row has no date for when the page was read" });
    }
  }

  return findings;
}
