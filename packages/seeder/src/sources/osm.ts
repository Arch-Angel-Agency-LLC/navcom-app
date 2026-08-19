import type { RawRecord } from "../seeded.js";

/**
 * OpenStreetMap, via Overpass.
 *
 * First source because it is openly licensed, globally present, and carries coordinates on
 * everything -- and without coordinates there is never a "nearest". Coverage is uneven and
 * that is fine: a skeleton in twenty metros beats a complete one in nobody's.
 *
 * ## Why there is no medical query here
 *
 * There was, briefly. `healthcare=centre` and `amenity=clinic` over St. Louis returned 23
 * records: a medical school building, a cancer centre, four private urgent-care franchises,
 * two travel clinics, five home-health agencies, and a medspa.
 *
 * The Medic wants *"the nearest ER that won't call police"* -- free or low-barrier care for
 * somebody with no insurance and no address. **OSM cannot distinguish that**, and neither
 * can any generic healthcare tag. A private urgent care in the list is not a neutral extra:
 * an operator sends somebody there and they are turned away or billed for money they do not
 * have.
 *
 * The general rule this is an instance of: **a source that cannot distinguish the thing that
 * matters must not be used for that category.** Medical belongs to sources that list
 * low-barrier care specifically -- federally qualified health centres, free clinic
 * directories -- and until one of those is wired up, medical stays empty rather than wrong.
 *
 * ## And why there is no `amenity=shelter` either
 *
 * The same lesson, worse. `amenity=shelter` in OSM means **a structure that keeps rain off**
 * -- picnic pavilions, storm cellars, bus stops. Excluding `shelter_type=public_transport`
 * removed the bus stops and left "Tornado Shelter", "Duck Shelter" and "Bowl Lake Pavilion"
 * filed as emergency accommodation.
 *
 * A private urgent care is a wasted journey. A park pavilion listed as a shelter is somebody
 * walking there at midnight in February.
 *
 * **Only `social_facility` describes a service rather than a building**, and services are
 * what this directory is for. Everything else OSM offers is architecture.
 */

export interface OsmConfig {
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
}

const ENDPOINT = "https://overpass-api.de/api/interpreter";

/**
 * What we ask Overpass for.
 *
 * Deliberately narrow. Broad queries return half a city and put the burden of exclusion on
 * a normalisation step that cannot see what it dropped.
 */
export function overpassQuery(bbox: OsmConfig["bbox"]): string {
  const [w, s, e, n] = bbox;
  const box = [s, w, n, e].join(",");
  const clauses = [
    'node["social_facility"]',
    'way["social_facility"]',
    'node["amenity"="social_facility"]',
    'way["amenity"="social_facility"]',
    'node["amenity"="food_bank"]',
    'way["amenity"="food_bank"]',
  ];
  return (
    "[out:json][timeout:90];(" +
    clauses.map((c) => c + "(" + box + ");").join("") +
    ");out center tags;"
  );
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** OSM says what a place IS in several competing tags. Preference order, most specific first. */
function categoryOf(tags: Record<string, string>): string | undefined {
  return (
    tags["social_facility"] ??
    tags["healthcare"] ??
    tags["amenity"] ??
    undefined
  );
}

function addressOf(tags: Record<string, string>): string | undefined {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter((p) => p && p.length > 0);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function fromOverpass(json: { elements?: OverpassElement[] }): RawRecord[] {
  const out: RawRecord[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags["name"];
    // Unnamed nodes are real in OSM and useless here -- an operator cannot be sent to one.
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    out.push({
      source: "osm",
      // type/id, not id alone: node/123 and way/123 are different places.
      sourceId: el.type + "/" + el.id,
      name,
      ...(categoryOf(tags) ? { category: categoryOf(tags)! } : {}),
      ...(addressOf(tags) ? { address: addressOf(tags)! } : {}),
      ...(typeof lat === "number" ? { lat } : {}),
      ...(typeof lon === "number" ? { lon } : {}),
      ...(tags["phone"] ?? tags["contact:phone"]
        ? { phone: (tags["phone"] ?? tags["contact:phone"]) as string }
        : {}),
      ...(tags["opening_hours"] ? { hours: tags["opening_hours"] } : {}),
      url: "https://www.openstreetmap.org/" + el.type + "/" + el.id,
    });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The only function here that touches a network. Everything above it is pure and tested.
 *
 * Overpass is free infrastructure with a small number of shared slots, and it sheds load by
 * dropping connections rather than politely queueing. A first run over sixty-seven metros
 * with no retry lost thirty-one of them to exactly that -- so this backs off and tries
 * again, which is both what gets the data and what a good neighbour does.
 */
export async function fetchOsm(
  config: OsmConfig,
  userAgent: string,
  attempts = 4,
): Promise<RawRecord[]> {
  let wait = 4_000;
  let last = "";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": userAgent },
        body: "data=" + encodeURIComponent(overpassQuery(config.bbox)),
      });
      // 429 is "too many", 504 is "gateway gave up on me". Both mean wait, not stop.
      if (response.status === 429 || response.status === 504) {
        last = "Overpass returned " + response.status;
      } else if (!response.ok) {
        // Anything else is our fault -- a malformed query does not improve with waiting.
        throw new Error("Overpass returned " + response.status);
      } else {
        return fromOverpass((await response.json()) as { elements?: OverpassElement[] });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith("Overpass returned")) throw err;
      last = message;
    }

    if (attempt < attempts) {
      await sleep(wait);
      wait *= 2;
    }
  }
  throw new Error("gave up after " + attempts + " attempts: " + last);
}
