/**
 * Runtime validation for data that crosses a trust boundary.
 *
 * Written by the Watchtower daemon against failures it actually hit, then promoted here
 * because every consumer needs it: a client parsing a response, a terminal reading a
 * config, a node handling a decrypted payload. Validation that lives in one implementation
 * is validation the others do without.
 *
 * Original context follows.
 *
 * Runtime validation for data that crosses a trust boundary: decrypted
 * signal payloads (attacker/bug-controlled ciphertext, only ever checked
 * at compile time via `as OnStationPayload`-style assertions before this
 * module existed) and config-file values (a TOML typo, e.g. quoting a
 * number, silently produces a string that satisfies every `??` fallback
 * check while corrupting downstream arithmetic).
 *
 * Found via a 15-pass robustness review (2026-08-17): a malformed
 * `expected_duration` (missing, NaN, non-numeric) reached
 * `new Date(NaN * 1000).toISOString()` inside Board.onStation() and threw
 * an uncaught RangeError, silently killing the response to that operator
 * -- a direct violation of "every signal receives at least an ack."
 * These validators exist to catch that class of input before it reaches
 * business logic, not after.
 */
import type { OnStationPayload, Position } from "./events/signal.js";

export class ValidationError extends Error {}

const HEX64 = /^[0-9a-f]{64}$/;

export function isValidHexPubkey(value: unknown): value is string {
  return typeof value === "string" && HEX64.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Strip control characters (including embedded newlines) and cap length
 * before a user-supplied string ever reaches a console.log line. Found
 * live: an unsanitized callsign/area containing "\n[board] + fake ..."
 * could forge additional log lines, undermining the manual, human-read
 * console verification the whole no-persistence design leans on for
 * checks 02/03/05.
 */
export function sanitizeForLog(value: string, maxLen = 64): string {
  // eslint-disable-next-line no-control-regex
  const stripped = value.replace(/[\x00-\x1f\x7f]/g, "");
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + "…" : stripped;
}

function isValidPosition(value: unknown): value is Position {
  if (value === null || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    isFiniteNumber(p.lat) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    isFiniteNumber(p.lon) &&
    p.lon >= -180 &&
    p.lon <= 180 &&
    isFiniteNumber(p.precision_m) &&
    p.precision_m >= 0
  );
}

/**
 * Validates and returns a clean OnStationPayload, or throws
 * ValidationError with a message specific enough to act on. Deliberately
 * does not sanitize callsign/area here (that's a display-time concern,
 * see sanitizeForLog) -- this only rejects structurally invalid input.
 */
export function validateOnStationPayload(payload: unknown): OnStationPayload {
  if (payload === null || typeof payload !== "object") {
    throw new ValidationError("on-station payload is not an object");
  }
  const p = payload as Record<string, unknown>;

  if (!isNonEmptyString(p.area)) {
    throw new ValidationError("on-station payload: area must be a non-empty string");
  }
  if (!isFiniteNumber(p.expected_duration) || p.expected_duration <= 0) {
    throw new ValidationError("on-station payload: expected_duration must be a positive number");
  }
  if (p.routine_interval !== null && (!isFiniteNumber(p.routine_interval) || p.routine_interval <= 0)) {
    throw new ValidationError("on-station payload: routine_interval must be a positive number or null");
  }
  if (typeof p.share_position !== "boolean") {
    throw new ValidationError("on-station payload: share_position must be a boolean");
  }
  if (p.position !== null && !isValidPosition(p.position)) {
    throw new ValidationError("on-station payload: position must be null or {lat, lon, precision_m}");
  }
  if (p.callsign !== undefined && typeof p.callsign !== "string") {
    throw new ValidationError("on-station payload: callsign must be a string if present");
  }

  return {
    ...(typeof p.callsign === "string" ? { callsign: p.callsign } : {}),
    area: p.area,
    expected_duration: p.expected_duration,
    routine_interval: p.routine_interval as number | null,
    share_position: p.share_position,
    position: p.position as Position | null,
  };
}
