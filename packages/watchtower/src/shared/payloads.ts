/**
 * Moved to @navcom/core. Re-exported so existing imports keep working.
 *
 * These shapes had diverged from the spec in six places — the state enum, on-call,
 * last_drill, provenance, distress position, and an invented overdue count — because this
 * side built against a self-contained brief rather than the normative document. There is
 * now one definition, and it is the spec's.
 */
export type {
  SignalType,
  Position,
  OnStationPayload,
  QueryPayload,
  AssistPayload,
  DistressPayload,
  SignalPayload,
  ResponseType,
  ResponsePayload,
  Provenance,
  WatchStatePayload,
  WatchState,
  HolderKind,
  OnCall,
  DrillResult,
  Author
} from "@navcom/core";

/** Retained: the daemon uses these as explicit empty-payload types. */
export type RoutinePayload = Record<string, never>;
export type StoodDownPayload = Record<string, never>;
