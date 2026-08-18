/**
 * Client transport.
 *
 * This used to be a second implementation of send-and-wait, living alongside the one in the
 * Field Terminal. Two implementations of the same wire behaviour agree right up until one
 * of them is fixed — and the fix that mattered here was `Distress` retrying indefinitely,
 * which only one of them had.
 *
 * The review findings that shaped the original are all preserved in `@navcom/core`:
 * distinguishing "never left the client" from "no response", verifying the response
 * signature, and not leaving a timer armed when `subscribeMany` throws synchronously.
 */

export {
  sendSignal,
  sendDistress,
  sendDistressUntilAcknowledged,
  waitForResponse,
  PublishError,
  type DistressPhase,
  type DistressOptions
} from "@navcom/core";
