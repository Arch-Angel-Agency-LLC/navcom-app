/**
 * Who may sign on. Per the Session One brief: "Any pubkey. The first
 * Watchtower is a closed test among people who know each other, and an
 * allowlist would be ceremony without security. This must not ship
 * beyond MVP, and it is the largest known gap between here and the next
 * milestone."
 *
 * This function is that gap, named as a single seam instead of an
 * absence scattered across every handler. The dispatch logic in
 * watchtower.ts already calls this at the right point (right after
 * signature verification, before any signal or distress event is
 * processed) -- this is still the one function that changes.
 *
 * ADDED (Stage 2, allowlist): *allowedPubkeys* comes from
 * DaemonConfig.authorization.allowedPubkeys (config.ts's
 * [authorization] allowed_pubkeys). An empty list preserves the brief's
 * exact MVP policy -- any pubkey is authorized -- so a deployment that
 * hasn't opted into an allowlist yet behaves exactly as before. Once an
 * operator populates the list, enforcement is a real allowlist: any
 * pubkey not on it is rejected. Deliberately a plain function taking the
 * list as a parameter (not reading config itself) -- same
 * dependency-injection style as WatchtowerDaemonOptions.pool, so this
 * stays trivially testable without needing a real config file on disk.
 */
export function isAuthorizedOperator(pubkey: string, allowedPubkeys: string[]): boolean {
  if (allowedPubkeys.length === 0) return true;
  return allowedPubkeys.includes(pubkey);
}
