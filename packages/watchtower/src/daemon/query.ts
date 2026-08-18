import type { QueryPayload, ResponsePayload } from "../shared/payloads.js";

/**
 * Session one has no live knowledge source -- this is the exact seam
 * session two replaces with a real call out to Mecha Jono ("that is one
 * function call," per the brief). The signature is deliberately already
 * shaped for that swap: takes the query payload, returns a response
 * payload, async.
 *
 * provenance is always null here on purpose. An answer without
 * provenance must render as unverified in any client -- hardcoding the
 * text is exactly the case that rule exists for.
 */
export async function answerQuery(
  _payload: QueryPayload,
  responderName: string,
): Promise<ResponsePayload> {
  return {
    type: "answer",
    responder: { kind: "agent", callsign: responderName },
    text: "Session one: no live knowledge source connected yet. This is a placeholder answer.",
    provenance: null,
  };
}
