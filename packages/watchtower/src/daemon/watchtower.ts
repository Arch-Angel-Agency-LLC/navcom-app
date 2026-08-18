import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, verifyEvent } from "nostr-tools/pure";
import type { Event, EventTemplate } from "nostr-tools/core";
import { installNodeWebSocket } from "../shared/nostr-node.js";
import { encryptPayload, decryptPayload } from "../shared/crypto.js";
import { WATCH_STATE_VERSION } from "@navcom/core";
import { KIND_WATCH_STATE, KIND_SIGNAL, KIND_DISTRESS, KIND_RESPONSE } from "../shared/kinds.js";
import type {
  QueryPayload,
  ResponsePayload,
  SignalType,
  WatchStatePayload,
} from "../shared/payloads.js";
import { validateOnStationPayload, ValidationError } from "../shared/validate.js";
import { isAuthorizedOperator } from "./authorization.js";
import { Board } from "./board.js";
import type { DaemonConfig } from "./config.js";
import { answerQuery } from "./query.js";

export interface WatchtowerDaemonOptions {
  config: DaemonConfig;
  secretKey: Uint8Array;
  pubkey: string;
  agentName?: string;
  /**
   * Inject a pre-built pool (a test fake, typically) instead of letting
   * the constructor build a real SimplePool. Added so WatchtowerDaemon
   * -- the one file tying every other piece together, and the one with
   * zero direct test coverage before this -- can be unit tested without
   * opening a real network connection.
   */
  pool?: SimplePool;
}

const AGENT_HEALTH_OK = "ok" as const;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function shortId(pubkey: string): string {
  return pubkey.slice(0, 8);
}

/**
 * A timeout is safe to describe to the operator -- unlike a raw internal
 * exception, "query answer timed out" carries no implementation detail
 * worth hiding, so handleSignalEvent's catch block treats this the same
 * way it treats ValidationError (real message passed through) rather
 * than genericizing it to "internal error handling signal."
 */
export class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class WatchtowerDaemon {
  readonly board = new Board();
  private readonly pool: SimplePool;
  private readonly config: DaemonConfig;
  private readonly secretKey: Uint8Array;
  private readonly pubkey: string;
  private readonly agentName: string;
  private readonly since: number;
  private heartbeatHandle: ReturnType<typeof setInterval> | undefined;
  private sweepHandle: ReturnType<typeof setInterval> | undefined;
  private subCloser: { close: (reason?: string) => void } | undefined;

  constructor(opts: WatchtowerDaemonOptions) {
    installNodeWebSocket();
    this.config = opts.config;
    this.secretKey = opts.secretKey;
    this.pubkey = opts.pubkey;
    this.agentName = opts.agentName ?? "watchtower";
    this.since = now();
    if (opts.pool) {
      this.pool = opts.pool;
      return;
    }
    // enableReconnect: true -- found in review: nostr-tools' SimplePool
    // defaults this to false. A daemon that silently stops receiving
    // signals after a transient network blip, with no auto-recovery and
    // no indication to anyone that it happened, is unacceptable for a
    // safety-coordination system.
    this.pool = new SimplePool({ enableReconnect: true });
    // Connection callbacks aren't part of SimplePool's typed constructor
    // (only enablePing/enableReconnect are) but ARE public, assignable
    // properties on the underlying AbstractSimplePool -- set them so a
    // relay drop/recovery is at least visible in the daemon's own logs,
    // even though there's no remote alerting in session one.
    this.pool.onRelayConnectionFailure = (url: string) => {
      console.warn(`[relay] connection failed: ${url}`);
    };
    this.pool.onRelayConnectionSuccess = (url: string) => {
      console.log(`[relay] connected: ${url}`);
    };
  }

  private get relayUrls(): string[] {
    return this.config.relays.urls;
  }

  private sign(template: EventTemplate): Event {
    return finalizeEvent(template, this.secretKey);
  }

  private async publishWatchState(): Promise<void> {
    const payload: WatchStatePayload = {
      v: WATCH_STATE_VERSION,
      state: "automated",
      holder: null,
      holder_kind: "agent",
      // Empty, and that is the honest value: nobody has declared themselves on-call.
      //
      // This previously published `this.board.size` — the number of operators OUT in the
      // field — as the number reachable to help them. An operator reading "3 on-call"
      // would have believed three people could be raised, when those three were the ones
      // on the street. An authored list cannot be assigned a board count by accident,
      // which is why it is a list.
      oncall: [],
      since: this.since,
      agent_health: AGENT_HEALTH_OK,
      last_drill: null,
      overdue_count: this.board.overdueCount,
    };
    const event = this.sign({
      kind: KIND_WATCH_STATE,
      tags: [],
      content: JSON.stringify(payload),
      created_at: now(),
    });
    await Promise.allSettled(this.pool.publish(this.relayUrls, event));
  }

  private async publishResponse(
    toPubkey: string,
    inReplyToEventId: string,
    payload: ResponsePayload,
  ): Promise<void> {
    const content = encryptPayload(this.secretKey, toPubkey, payload);
    const event = this.sign({
      kind: KIND_RESPONSE,
      tags: [
        ["p", toPubkey],
        ["e", inReplyToEventId],
      ],
      content,
      created_at: now(),
    });
    const results = await Promise.allSettled(this.pool.publish(this.relayUrls, event));
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    console.log(
      `[respond] -> ${shortId(toPubkey)} type=${payload.type} (${okCount}/${results.length} relays)`,
    );
  }

  private ack(): ResponsePayload {
    return { type: "ack", responder: { kind: "agent", callsign: this.agentName }, text: null, provenance: null };
  }

  private handleOnStation(operatorPubkey: string, rawPayload: unknown): void {
    // Found in review: this used to trust `payload as OnStationPayload`
    // with zero runtime checking -- a malformed expected_duration
    // (missing/NaN/non-numeric) reached
    // `new Date(NaN * 1000).toISOString()` inside Board.onStation() and
    // threw an uncaught RangeError, silently killing the response to
    // that operator. validateOnStationPayload() throws a clear
    // ValidationError instead, which handleSignalEvent's outer try/catch
    // now turns into an actual error-ack rather than silence.
    const payload = validateOnStationPayload(rawPayload);
    const callsign = payload.callsign?.trim() || `OP-${operatorPubkey.slice(0, 6)}`;
    // "?? default" would be wrong here: the wire contract says an
    // EXPLICIT null disables routine check-ins, and `??` treats null and
    // undefined identically, silently overriding a deliberate "disable"
    // with the config default. Only a genuinely missing key (malformed
    // payload, not a spec-following client) falls back to the default.
    const routineIntervalSeconds =
      "routine_interval" in payload
        ? payload.routine_interval
        : this.config.watch.routineIntervalDefault;
    this.board.onStation({
      operator: operatorPubkey,
      callsign,
      area: payload.area,
      expectedDurationSeconds: payload.expected_duration,
      routineIntervalSeconds,
      position: payload.share_position ? payload.position : null,
      now: now(),
    });
  }

  private async handleSignalEvent(event: Event): Promise<void> {
    const tTag = event.tags.find((t) => t[0] === "t")?.[1];
    const type = tTag as SignalType | undefined;
    if (!type) {
      console.log(`[signal] dropped: missing t tag (${event.id.slice(0, 8)})`);
      return;
    }

    let payload: unknown;
    try {
      payload = decryptPayload(this.secretKey, event.pubkey, event.content);
    } catch {
      console.log(`[signal] dropped: undecryptable content (${event.id.slice(0, 8)})`);
      return;
    }

    // Found in review: everything from here down used to run outside
    // any try/catch, so ANY exception (a validation failure, an
    // encryption error building the response, anything) propagated up
    // to startListening()'s bare `task.catch(log-and-drop)` -- meaning
    // the operator got total silence, violating "every signal receives
    // at least an ack." This now guarantees SOME response is attempted
    // for every signal we understood well enough to reach this point,
    // even when handling it failed.
    let response: ResponsePayload;
    try {
      switch (type) {
        case "on-station": {
          this.handleOnStation(event.pubkey, payload);
          response = this.ack();
          break;
        }
        case "routine": {
          this.board.routine(event.pubkey, now());
          response = this.ack();
          break;
        }
        case "query": {
          this.board.touch(event.pubkey, now());
          response = await withTimeout(
            answerQuery(payload as QueryPayload, this.agentName),
            this.config.watch.queryTimeoutSeconds * 1000,
            "query answer timed out",
          );
          break;
        }
        case "assist": {
          this.board.touch(event.pubkey, now());
          response = this.ack();
          break;
        }
        case "stood-down": {
          this.board.standDown(event.pubkey);
          response = this.ack();
          break;
        }
        default: {
          console.log(`[signal] dropped: unknown type "${type}" (${event.id.slice(0, 8)})`);
          return;
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof ValidationError || err instanceof TimeoutError
          ? err.message
          : "internal error handling signal";
      console.error(`[signal] handling "${type}" from ${shortId(event.pubkey)} failed: ${String(err)}`);
      response = { type: "ack", responder: { kind: "agent", callsign: this.agentName }, text: `error: ${message}`, provenance: null };
    }

    await this.publishResponse(event.pubkey, event.id, response);
  }

  private async handleDistressEvent(event: Event): Promise<void> {
    // Distress is always a deliberate act -- never inferred. This
    // handler only ever fires from an explicit kind-20911 event the
    // operator sent, never from a missed check-in (that's overdue,
    // which is a nudge, not distress).
    this.board.distress(event.pubkey, now());
    const response: ResponsePayload = {
      type: "ack",
      responder: { kind: "agent", callsign: this.agentName },
      text: null,
      provenance: null,
    };
    await this.publishResponse(event.pubkey, event.id, response);
  }

  private startListening(): void {
    this.subCloser = this.pool.subscribeMany(
      this.relayUrls,
      { kinds: [KIND_SIGNAL, KIND_DISTRESS], "#p": [this.pubkey], since: this.since },
      {
        onevent: (event: Event) => {
          if (!verifyEvent(event)) {
            console.log(`[signal] dropped: bad signature (${event.id.slice(0, 8)})`);
            return;
          }
          if (!isAuthorizedOperator(event.pubkey, this.config.authorization.allowedPubkeys)) {
            // Silent drop, not an ack -- an unauthorized sender doesn't
            // get confirmation that anything was even received. With no
            // allowed_pubkeys configured this never fires (matches
            // Session One's "any pubkey" MVP policy); once a real
            // allowlist is set, telling a rejected party "yes, I'm here,
            // and no" is strictly worse than saying nothing.
            console.log(`[signal] dropped: unauthorized operator (${shortId(event.pubkey)})`);
            return;
          }
          const task =
            event.kind === KIND_DISTRESS
              ? this.handleDistressEvent(event)
              : this.handleSignalEvent(event);
          task.catch((err: unknown) => {
            console.error(`[signal] handler error: ${String(err)}`);
          });
        },
      },
    );
  }

  async start(): Promise<void> {
    await this.publishWatchState();
    this.startListening();
    this.heartbeatHandle = setInterval(() => {
      this.publishWatchState().catch((err: unknown) => {
        console.error(`[heartbeat] publish failed: ${String(err)}`);
      });
    }, this.config.watch.heartbeatIntervalSeconds * 1000);
    this.sweepHandle = setInterval(() => {
      // The onOverdue callback triggers an immediate out-of-band
      // publishWatchState() -- "notify whoever holds watch" (per
      // review) shouldn't wait up to a full heartbeatIntervalSeconds
      // (60s default) after the actual transition. This is deliberately
      // still just the aggregate overdue_count, same as the regular
      // heartbeat -- no operator identity in this path either.
      this.board.sweep(now(), this.config.watch.overdueGrace, this.config.watch.hardExpiry, () => {
        this.publishWatchState().catch((err: unknown) => {
          console.error(`[overdue] notify publish failed: ${String(err)}`);
        });
      });
    }, this.config.watch.sweepIntervalSeconds * 1000);
  }

  async stop(): Promise<void> {
    if (this.heartbeatHandle) clearInterval(this.heartbeatHandle);
    if (this.sweepHandle) clearInterval(this.sweepHandle);
    this.subCloser?.close("shutdown");
    this.pool.destroy();
  }
}
