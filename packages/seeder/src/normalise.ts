import { createHash } from "node:crypto";
import { RESOURCE_TYPES, type ResourceType } from "@navcom/core";
import type { RawRecord, SeededRecord } from "./seeded.js";

/**
 * Turning what a source said into something this directory can hold.
 *
 * Every judgement here fails toward "I do not know" rather than toward a plausible guess.
 * A warming centre filed as a shelter sends somebody to a building that will not take them.
 */

/**
 * Ids must survive a re-scrape.
 *
 * Derived from the region, the source and the source's own identifier -- never from a row
 * number, a position in a list, or a name. Otherwise every run reads as a mass deletion
 * followed by a mass creation, and the git diff that was supposed to be the review
 * mechanism becomes unreadable.
 */
export function seededId(region: string, raw: RawRecord): string {
  const digest = createHash("sha256")
    .update(raw.source + " " + raw.sourceId)
    .digest("hex")
    .slice(0, 8);
  return region + "-" + raw.source + "-" + digest;
}

/**
 * A source's own vocabulary, mapped onto ours.
 *
 * **Returns undefined for anything that does not map cleanly, and the record is then not
 * shipped at all.** There is no catch-all type, and adding one is not this tool's decision:
 * extending the `type` taxonomy needs a human with local knowledge, by an explicit rule.
 *
 * "Somewhere that helps, uncharacterised" is not something an operator can act on at 11pm,
 * and a confident wrong category is worse -- a warming centre filed as a shelter sends
 * somebody to a building that will not take them. So unmapped categories become a line in
 * the report for the person who owns the taxonomy, not a row in the directory.
 */
export function mapType(category: string | undefined): ResourceType | undefined {
  if (!category) return undefined;
  const c = category.toLowerCase().replace(/[\s_-]+/g, "");

  const table: Record<string, ResourceType> = {
    shelter: "shelter", homelessshelter: "shelter", emergencyshelter: "shelter",
    nightshelter: "shelter", refuge: "shelter",
    soupkitchen: "meal", foodbank: "meal", foodpantry: "meal", meal: "meal", food: "meal",
    shower: "hygiene", laundry: "hygiene", hygiene: "hygiene", toilets: "hygiene",
    clinic: "medical", doctors: "medical", hospital: "medical", healthcare: "medical",
    medical: "medical", pharmacy: "medical",
    harmreduction: "harm_reduction", needleexchange: "harm_reduction",
    syringeservices: "harm_reduction",
    warming: "warming", warmingcenter: "warming", warmingcentre: "warming",
    cooling: "cooling", coolingcenter: "cooling", coolingcentre: "cooling",
    storage: "storage", legal: "legal", legalaid: "legal",
    iddocs: "id_docs", identification: "id_docs",
    mail: "mail", post: "mail", charging: "charging",
    veterinary: "veterinary", vet: "veterinary", animalshelter: "veterinary",
    youth: "youth", youthservices: "youth",
    dv: "dv", domesticviolence: "dv",
    detox: "detox", substanceabuse: "detox",
    daytime: "daytime", daycentre: "daytime", daycenter: "daytime", dropin: "daytime",
  };

  const mapped = table[c];
  // Defensive: a table entry that drifts from the core enum must not ship a bad type. An
  // earlier version cast an invented "other" past the compiler; the data validator caught
  // it on the first real run, and this is the check that would have caught it sooner.
  return mapped && RESOURCE_TYPES.includes(mapped) ? mapped : undefined;
}

/**
 * Phone numbers, normalised so a `tel:` link works on the first tap.
 *
 * The most-used field on the whole surface at 11pm, and the one where a stray character
 * costs somebody a call. Returns undefined rather than guessing at anything it cannot
 * confidently read -- an absent phone renders as unknown, which is true.
 */
export function normalisePhone(raw: string | undefined, country = "US"): string | undefined {
  if (!raw) return undefined;
  // Drop extensions before counting digits: "555-0100 x23" is a 7-digit number, not 9.
  const trunk = raw.split(/\s(?:x|ext\.?|extension)\s*/i)[0] ?? raw;
  const digits = trunk.replace(/\D/g, "");
  if (digits.length === 0) return undefined;

  if (raw.trim().startsWith("+")) return "+" + digits;
  if (country === "US") {
    if (digits.length === 10) return "+1" + digits;
    if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  }
  return undefined;
}

/** Collapses whitespace and strips the wrapping quotes some sources leave behind. */
function tidy(s: string | undefined): string | undefined {
  const t = s?.replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim();
  return t ? t : undefined;
}

/** Null when the record cannot be characterised. The caller drops it and reports why. */
export function normalise(region: string, raw: RawRecord, country = "US"): SeededRecord | null {
  const name = tidy(raw.name);
  if (!name) throw new Error(raw.source + ":" + raw.sourceId + " has no name");

  const type = mapType(raw.category);
  if (!type) return null;

  const address = tidy(raw.address);
  const phone = normalisePhone(raw.phone, country);
  // Free text on purpose. An "open now" computed from a scraped string is a confident
  // wrong answer waiting for a public holiday.
  const hours = tidy(raw.hours);

  return {
    id: seededId(region, raw),
    name,
    type,
    ...(address ? { address } : {}),
    ...(typeof raw.lat === "number" && Number.isFinite(raw.lat) ? { lat: raw.lat } : {}),
    ...(typeof raw.lon === "number" && Number.isFinite(raw.lon) ? { lon: raw.lon } : {}),
    ...(phone ? { phone } : {}),
    ...(hours ? { hours } : {}),
    ...(raw.languages?.length ? { languages: raw.languages } : {}),
  };
}
