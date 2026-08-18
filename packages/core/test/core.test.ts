import { describe, expect, it } from 'vitest';

import { deriveWeight, ageInDays, known, unknown } from '../src/attestation';
import { newSecretKey, publicKeyOf, secretFromHex, secretToHex } from '../src/crypto/keys';
import { open, seal } from '../src/crypto/envelope';
import { buildWatchStateEvent, capabilitySentence, darkState, pageableNow, publishableWatchState, readWatchState, WATCH_STATE_VERSION } from '../src/events/watch-state';
import { readWatchStateAt } from '../src/events/watch-state';
import { appendEntry, asCompleteLog, emptyLog, entriesAbout, verifyChain, type LogOutcome } from '../src/log';
import { sendDistressUntilAcknowledged } from '../src/transport';
import { finalizeEvent } from 'nostr-tools/pure';
import { buildDistress, buildSignal, RESPONSE_WINDOW } from '../src/events/signal';
import { isUnverified, type ResponsePayload } from '../src/events/response';
import { KIND_DISTRESS, KIND_RESPONSE, KIND_SIGNAL, KIND_WATCH_STATE, isEphemeral, readTag } from '../src/events/kinds';
import { DEFAULT_LIFETIMES, isExpired, isOverdue, standDown, tick, type BoardEntry } from '../src/board';

const NOW = new Date('2026-08-18T12:00:00Z');
const NOW_S = Math.floor(NOW.getTime() / 1000);

const METHODS = {
  in_person: 'high', staff_confirmed: 'high', phone: 'medium',
  secondhand: 'low', website: 'low'
} as const;

describe('attestation', () => {
  it('derives weight from method and age, never from the author', () => {
    const a = { method: 'in_person' as const, at: '2026-08-16' };
    expect(deriveWeight(a, METHODS, NOW, { staleAfterDays: 14 })).toBe('high');
    expect(deriveWeight({ method: 'phone', at: '2026-08-16' }, METHODS, NOW, { staleAfterDays: 14 })).toBe('medium');
  });

  it('goes stale past the window regardless of how well it was known', () => {
    const a = { method: 'in_person' as const, at: '2026-07-01' };
    expect(deriveWeight(a, METHODS, NOW, { staleAfterDays: 14 })).toBe('stale');
  });

  it('a dispute overrides even a same-day in-person check', () => {
    const a = { method: 'in_person' as const, at: '2026-08-18' };
    expect(deriveWeight(a, METHODS, NOW, { staleAfterDays: 365, disputed: true })).toBe('suspect');
  });

  it('the margin errs toward stale, which is the safe direction', () => {
    const a = { method: 'in_person' as const, at: '2026-08-04' }; // exactly 14 days
    expect(deriveWeight(a, METHODS, NOW, { staleAfterDays: 14 })).toBe('high');
    expect(deriveWeight(a, METHODS, NOW, { staleAfterDays: 14, marginDays: 1 })).toBe('stale');
  });

  it('distinguishes "nobody established this" from a negative claim', () => {
    expect(unknown<boolean>()).toEqual({ known: false });
    expect(known(false)).toEqual({ known: true, value: false });
  });

  it('counts age in whole days', () => {
    expect(ageInDays('2026-08-15', NOW)).toBe(3);
    expect(ageInDays('2026-08-18T23:00:00Z', NOW)).toBe(0);
  });
});

describe('keys and envelope', () => {
  it('round-trips a secret through hex', () => {
    const k = newSecretKey();
    expect(secretToHex(secretFromHex(secretToHex(k)))).toBe(secretToHex(k));
  });

  it('rejects a malformed secret rather than guessing', () => {
    expect(() => secretFromHex('nope')).toThrow(/64 hex/);
  });

  it('seals to the Watchtower and opens with its secret', () => {
    const operator = newSecretKey();
    const watchtower = newSecretKey();
    const sealed = seal(operator, publicKeyOf(watchtower), { area: 'north side' });
    expect(sealed).not.toContain('north side');
    expect(open(watchtower, publicKeyOf(operator), sealed)).toEqual({ area: 'north side' });
  });

  it('a third party cannot open it', () => {
    const operator = newSecretKey();
    const watchtower = newSecretKey();
    const stranger = newSecretKey();
    const sealed = seal(operator, publicKeyOf(watchtower), { area: 'north side' });
    expect(() => open(stranger, publicKeyOf(operator), sealed)).toThrow();
  });
});

describe('watch state — what may honestly be published', () => {
    const NODE = { kind: 'node' as const, callsign: 'watchtower' };
  const onCall = (channel: 'sms' | 'console-open', mins = 60) => ({
    author: NODE, channel, expires: NOW_S + mins * 60
  });
  const base = {
    state: 'automated-oncall' as const, holder: 'Mecha Jono', holder_kind: 'agent' as const,
    oncall: [onCall('sms'), onCall('sms')], since: NOW_S, agent_health: 'ok' as const,
    last_drill: { at: NOW_S - 86400, result: 'pass' as const, author: NODE, acknowledged: [] },
    overdue_count: 0,
    now: NOW_S
  };

  it('publishes automated-oncall when the ladder is proven and reachable', () => {
    expect(publishableWatchState(base).state).toBe('automated-oncall');
  });

  it('demotes to automated when nobody is pageable right now', () => {
    expect(publishableWatchState({ ...base, oncall: [] }).state).toBe('automated');
  });

  it('demotes to automated when no drill has ever passed', () => {
    expect(publishableWatchState({ ...base, last_drill: null }).state).toBe('automated');
    expect(publishableWatchState({ ...base, last_drill: { at: 1, result: 'fail', author: NODE, acknowledged: [] } }).state).toBe('automated');
  });

  it('never demotes station — a human is present regardless of drills', () => {
    const s = publishableWatchState({ ...base, state: 'station', holder_kind: 'human', last_drill: null, oncall: [] });
    expect(s.state).toBe('station');
  });

  it('reads absence as Dark, not as an error or unknown', () => {
    expect(readWatchState(null).state).toBe('dark');
    expect(readWatchState('').state).toBe('dark');
    expect(readWatchState('{ not json').state).toBe('dark');
    expect(darkState().agent_health).toBe('down');
  });

  it('tells an operator the consequence, not the label', () => {
    expect(capabilitySentence(publishableWatchState(base))).toMatch(/2 on-call, reachable now/);
    expect(capabilitySentence(publishableWatchState({ ...base, oncall: [] })))
      .toMatch(/page nobody and tell you so/);
    expect(capabilitySentence(darkState())).toMatch(/No watch/);
  });
});

describe('signals', () => {
  const operator = newSecretKey();
  const watchtower = newSecretKey();
  const wt = publicKeyOf(watchtower);

  it('carries the signal type unencrypted so a client can filter without decrypting', () => {
    const e = buildSignal(operator, wt, 'query', { text: 'bed tonight, has a dog' }, NOW_S);
    expect(readTag(e.tags, 't')).toBe('query');
    expect(readTag(e.tags, 'p')).toBe(wt);
    expect(e.content).not.toContain('dog');
  });

  it('seals the payload to the Watchtower key', () => {
    const e = buildSignal(operator, wt, 'on-station', {
      area: 'north side', expected_duration: 7200, routine_interval: 3600,
      share_position: false, position: null
    }, NOW_S);
    expect(open(watchtower, publicKeyOf(operator), e.content)).toMatchObject({ area: 'north side' });
  });

  it('gives distress its own kind and no filterable type tag', () => {
    const e = buildDistress(operator, wt, { position: null, area: 'north side' }, NOW_S);
    expect(e.kind).toBe(KIND_DISTRESS);
    expect(readTag(e.tags, 't')).toBeUndefined();
  });

  it('has no window for distress — it is immediate and escalating', () => {
    expect(RESPONSE_WINDOW.distress).toBeNull();
    expect(RESPONSE_WINDOW.query).toBe(120);
  });
});

describe('responses', () => {
  const answer = (provenance: ResponsePayload['provenance']): ResponsePayload => ({
    type: 'answer',
    responder: { kind: 'human', callsign: 'Raven' },
    text: 'Open until 22:00',
    provenance
  });

  it('an answer without provenance must render unverified', () => {
    expect(isUnverified(answer(null))).toBe(true);
    expect(isUnverified(answer({ record_id: 'x', verified: '2026-08-14', method: 'in_person' }))).toBe(false);
  });

  it('an acknowledgement is not an unverified answer', () => {
    expect(isUnverified({ ...answer(null), type: 'ack' })).toBe(false);
  });
});

describe('the board', () => {
  const entry = (over: Partial<BoardEntry> = {}): BoardEntry => ({
    operator: 'pk', callsign: 'Raven', area: 'north side',
    signed_on: NOW_S - 3600, expected_until: NOW_S + 3600, routine_due: null,
    last_contact: NOW_S - 600, position: null, status: 'active', ...over
  });

  it('marks overdue past the grace window', () => {
    const e = entry({ expected_until: NOW_S - DEFAULT_LIFETIMES.overdueGrace - 1 });
    expect(isOverdue(e, NOW_S)).toBe(true);
  });

  it('does not mark overdue inside the grace window', () => {
    expect(isOverdue(entry({ expected_until: NOW_S - 60 }), NOW_S)).toBe(false);
  });

  it('never marks a distress entry overdue — it is already past that', () => {
    const e = entry({ status: 'distress', expected_until: NOW_S - 99999 });
    expect(isOverdue(e, NOW_S)).toBe(false);
  });

  it('drops a forgotten sign-on at hard expiry', () => {
    const e = entry({ expected_until: NOW_S - DEFAULT_LIFETIMES.hardExpiry - 1 });
    expect(isExpired(e, NOW_S)).toBe(true);
  });

  it('NEVER drops a distress entry, however old', () => {
    const e = entry({ status: 'distress', expected_until: NOW_S - 999999 });
    expect(isExpired(e, NOW_S)).toBe(false);
    expect(tick([e], NOW_S).board).toHaveLength(1);
    expect(tick([e], NOW_S).expired).toHaveLength(0);
  });

  it('standing down removes the entry rather than parking it in a status', () => {
    expect(standDown([entry()], 'pk')).toHaveLength(0);
  });

  it('a tick is pure — same input, same output, no clock of its own', () => {
    const board = [entry(), entry({ operator: 'pk2', expected_until: NOW_S - 99999 })];
    const a = tick(board, NOW_S);
    const b = tick(board, NOW_S);
    expect(a).toEqual(b);
    expect(a.expired.map((e) => e.operator)).toEqual(['pk2']);
  });
});

describe('kinds', () => {
  it('keeps live traffic on ephemeral kinds so the board cannot become a history', () => {
    expect(isEphemeral(KIND_SIGNAL)).toBe(true);
    expect(isEphemeral(KIND_DISTRESS)).toBe(true);
    expect(isEphemeral(KIND_RESPONSE)).toBe(true);
    expect(isEphemeral(KIND_WATCH_STATE)).toBe(false);
  });
});

describe('on-call is a list of statements, not a number', () => {
  const NODE2 = { kind: 'node' as const, callsign: 'watchtower' };
  const decl = (channel: 'sms' | 'console-open', expiresIn: number) => ({
    author: NODE2, channel, expires: NOW_S + expiresIn
  });

  it('drops expired declarations — a stale one is not a person who will wake', () => {
    expect(pageableNow([decl('sms', -60), decl('sms', 600)], NOW_S)).toHaveLength(2 - 1);
  });

  it('treats a console-open-only roster as empty, and the state says so', () => {
    expect(pageableNow([decl('console-open', 600)], NOW_S)).toHaveLength(0);
  });

  it('keeps console-open when someone else is genuinely reachable', () => {
    expect(pageableNow([decl('console-open', 600), decl('sms', 600)], NOW_S)).toHaveLength(2);
  });

  it('publishes only the reachable, so the count cannot exceed the evidence', () => {
    const s = publishableWatchState({
      state: 'automated-oncall', holder: null, holder_kind: 'agent',
      oncall: [decl('sms', 600), decl('sms', -1)], since: NOW_S, agent_health: 'ok',
      last_drill: { at: NOW_S, result: 'pass', author: NODE2, acknowledged: [] }, overdue_count: 0, now: NOW_S
    });
    expect(s.oncall).toHaveLength(1);
  });

  it('carries a version so a consumer can notice the shape changed', () => {
    expect(darkState().v).toBe(WATCH_STATE_VERSION);
    expect(readWatchState('{"state":"automated"}').v).toBe(1);
  });
});

describe('the accountability log', () => {
  const actor = { kind: 'human' as const, callsign: 'Raven' };
  const wren = { kind: 'human' as const, callsign: 'Wren', pubkey: 'a'.repeat(64) };
  const otherWren = { kind: 'human' as const, callsign: 'Wren', pubkey: 'b'.repeat(64) };
  const entry = (outcome: LogOutcome) => ({
    at: NOW_S, actor, action: 'acked' as const, subject: wren, outcome
  });

  it('chains each entry to the one before it', () => {
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, entry('answered'));
    expect(log[0].prev).toBeNull();
    expect(log[1].prev).toBe(log[0].hash);
    expect(verifyChain(log).intact).toBe(true);
  });

  it('detects an entry edited after the fact', () => {
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, entry('answered'));
    const tampered = asCompleteLog([{ ...log[0], outcome: 'contact-made' as const }, log[1]]);
    const check = verifyChain(tampered);
    expect(check.intact).toBe(false);
    expect(check.brokenAt).toBe(0);
  });

  it('detects a removed entry', () => {
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, entry('answered'));
    log = appendEntry(log, entry('no-answer'));
    expect(verifyChain(asCompleteLog([log[0], log[2]])).intact).toBe(false);
  });

  it('does NOT detect a false entry written at the time', () => {
    // Honest limit. Chaining closes tampering; only a counter-signature by the subject
    // closes fabrication, and nothing counter-signs yet.
    const log = appendEntry(emptyLog(), entry('contact-made'));
    expect(verifyChain(log).intact).toBe(true);
    expect(log[0].countersig).toBeUndefined();
  });

  it('cannot record an area, a position or a query text at all', () => {
    // outcome used to be a free string, and the outcomes this very test file once used
    // included "contacted the operator, all fine" -- one edit away from carrying a street.
    // A union removes the channel rather than asking call sites to be careful.
    const outcomes: LogOutcome[] = ['acknowledged', 'contact-not-attempted', 'went-dark'];
    for (const o of outcomes) {
      expect(typeof o).toBe('string');
    }
    // @ts-expect-error a free-text outcome no longer compiles
    expect(() => entry('found them on 4th and Market')).toBeDefined();
  });

  it('survives retention dropping its oldest entries, given the declared new start', () => {
    // Rotation leaves the oldest surviving entry pointing at a hash that no longer exists.
    // Without a declared start that is indistinguishable from tampering -- the log would
    // accuse itself every 90 days.
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, entry('answered'));
    log = appendEntry(log, entry('no-answer'));

    const kept = asCompleteLog([log[1], log[2]]);
    expect(verifyChain(kept).intact, 'should look broken without the declared start').toBe(false);
    expect(verifyChain(kept, { startsAt: log[0].hash }).intact).toBe(true);
  });

  it('still catches tampering after a rotation', () => {
    // The declared start must not become a way to launder an edited history.
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, entry('answered'));
    log = appendEntry(log, entry('no-answer'));

    const kept = asCompleteLog([{ ...log[1], outcome: 'contact-made' as const }, log[2]]);
    expect(verifyChain(kept, { startsAt: log[0].hash }).intact).toBe(false);
  });

  it('shows an operator only what concerns them', () => {
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, { ...entry('answered'), subject: otherWren });
    // Two operators, same callsign, different keys. Matching on the name would return both,
    // and the log would attribute one person's entries to another.
    expect(entriesAbout(log, wren.pubkey)).toHaveLength(1);
    expect(entriesAbout(log, otherWren.pubkey)).toHaveLength(1);
  });

  it('will not let a filtered view be passed off as a verifiable one', () => {
    // Found while planning the operator's review screen: entriesAbout() returns entries
    // whose links point at other people's, so verifyChain() must always reject them. Both
    // functions existed, read as though they composed, and did not. The type says so now.
    let log = appendEntry(emptyLog(), entry('acknowledged'));
    log = appendEntry(log, { ...entry('answered'), subject: otherWren });
    const mine = entriesAbout(log, wren.pubkey);
    // @ts-expect-error a filtered view is not a CompleteLog, and cannot be chain-verified
    expect(() => verifyChain(mine)).toBeDefined();
  });
});

describe('a replaceable event outlives the daemon that published it', () => {
  // Found by the Watchtower daemon running against a real relay: kind 10910 is replaceable,
  // so a relay keeps serving the last copy after the publisher dies. Checking only for
  // absence reads that corpse as a live watch — invariant 4 failing exactly as written.
  const live = JSON.stringify({ v: 2, state: 'automated', oncall: [], agent_health: 'ok' });

  it('reads a fresh event as live', () => {
    const r = readWatchStateAt(live, { createdAt: NOW_S - 10, now: NOW_S });
    expect(r.dark).toBe(false);
    expect(r.state.state).toBe('automated');
  });

  it('reads a stale event as DARK, however healthy it claims to be', () => {
    const r = readWatchStateAt(live, { createdAt: NOW_S - 4000, now: NOW_S });
    expect(r.dark).toBe(true);
    expect(r.reason).toBe('stale');
    expect(r.state.state).toBe('dark');
  });

  it('reads absence as dark', () => {
    expect(readWatchStateAt(null).reason).toBe('absent');
  });

  it('reads malformed content as dark', () => {
    expect(readWatchStateAt('{ not json').reason).toBe('corrupt');
  });

  it('treats an unknown age as dark rather than assuming it is fresh', () => {
    const r = readWatchStateAt(live, { now: NOW_S });
    expect(r.dark).toBe(true);
    expect(r.reason).toBe('stale');
  });
});

describe('distress keeps trying until a human acknowledges', () => {
  // The spec requires retry with backoff, indefinitely. It is what makes an ephemeral
  // transport acceptable for the one signal that matters: relays do not store these events,
  // so a single failed publish is a signal nobody ever receives.
  const secret = newSecretKey();
  const wt = newSecretKey();
  const watchtower = publicKeyOf(wt);
  const ourPubkey = publicKeyOf(secret);
  const payload = { position: null, area: 'north side' };

  function fakePool(behaviour: {
    publishFails?: number;
    ackOnAttempt?: number;
    /** Attempts on which an *agent* answers. An agent answer is not closure [invariant 5]. */
    agentOnAttempts?: number[];
    /** Answers with no responder kind at all — a broken responder, treated as not-human. */
    facelessOnAttempts?: number[];
  }) {
    let publishes = 0;
    const subs: ((e: unknown) => void)[] = [];
    return {
      publish(relays: string[]) {
        publishes++;
        const failing = publishes <= (behaviour.publishFails ?? 0);
        return relays.map(() => (failing ? Promise.reject(new Error('relay refused')) : Promise.resolve('ok')));
      },
      subscribeMany(_r: string[], _f: unknown, params: { onevent(e: unknown): void }) {
        const agent = behaviour.agentOnAttempts?.includes(publishes);
        const faceless = behaviour.facelessOnAttempts?.includes(publishes);
        if (publishes === behaviour.ackOnAttempt || agent || faceless) {
          const responder = faceless
            ? undefined
            : agent
              ? { kind: 'agent' as const, callsign: 'Mecha Jono' }
              : { kind: 'human' as const, callsign: 'Wren' };
          // Really signed by the Watchtower key: waitForResponse verifies the signature,
          // so an unsigned fake would be dropped exactly as a forged one should be.
          const event = finalizeEvent(
            {
              kind: KIND_RESPONSE,
              created_at: Math.floor(Date.now() / 1000),
              tags: [['p', ourPubkey]],
              content: seal(wt, ourPubkey, {
                type: 'ack',
                responder,
                text: null,
                provenance: null
              })
            },
            wt
          );
          queueMicrotask(() => params.onevent(event));
        }
        subs.push(params.onevent);
        return { close() {} };
      },
      close() {},
      get publishes() { return publishes; }
    };
  }

  const noSleep = async () => {};

  it('an agent answering is not closure — the loop keeps going until a human does', async () => {
    // Invariant 2: Distress terminates in a human, or tells the operator it could not.
    // Invariant 5: an agent is never the sole responder. An agent ack that stopped the
    // retries would satisfy neither, while looking on screen exactly like help arriving.
    const pool = fakePool({ agentOnAttempts: [1, 2], ackOnAttempt: 3 });
    const phases: string[] = [];
    const res = await sendDistressUntilAcknowledged(
      pool as never, ['wss://r'], secret, ourPubkey, watchtower, payload,
      { ackWindowMs: 50, sleep: noSleep, onPhase: (p) => phases.push(p.phase) }
    );

    expect(phases.filter((p) => p === 'agent-holding')).toHaveLength(2);
    expect(phases.filter((p) => p === 'acknowledged')).toHaveLength(1);
    // The agent answers are reported, so the operator knows the signal is getting through —
    // they are just not the end of it.
    expect(phases.indexOf('acknowledged')).toBeGreaterThan(phases.lastIndexOf('agent-holding'));
    expect(res.responder?.kind).toBe('human');
  });

  it('a response with no responder kind is not treated as a human', async () => {
    // The spec makes responder.kind mandatory, so an absent one is a broken responder.
    // Guessing "human" there is the one wrong guess this loop must never make.
    const pool = fakePool({ facelessOnAttempts: [1], ackOnAttempt: 2 });
    const phases: string[] = [];
    const res = await sendDistressUntilAcknowledged(
      pool as never, ['wss://r'], secret, ourPubkey, watchtower, payload,
      { ackWindowMs: 50, sleep: noSleep, onPhase: (p) => phases.push(p.phase) }
    );
    expect(phases.filter((p) => p === 'agent-holding')).toHaveLength(1);
    expect(res.responder?.kind).toBe('human');
  });

  it('reports every attempt, and stops only when acknowledged', async () => {
    const pool = fakePool({ ackOnAttempt: 3 });
    const phases: string[] = [];
    const res = await sendDistressUntilAcknowledged(
      pool as never, ['wss://r'], secret, ourPubkey, watchtower, payload,
      { ackWindowMs: 50, sleep: noSleep, onPhase: (p) => phases.push(p.phase) }
    );
    expect(res.type).toBe('ack');
    expect(phases).toContain('acknowledged');
    // Two unanswered rounds before the one that landed.
    expect(phases.filter((p) => p === 'no-answer')).toHaveLength(2);
  });

  it('distinguishes "never left the device" from "no answer"', async () => {
    const pool = fakePool({ publishFails: 2, ackOnAttempt: 3 });
    const phases: string[] = [];
    await sendDistressUntilAcknowledged(
      pool as never, ['wss://r'], secret, ourPubkey, watchtower, payload,
      { ackWindowMs: 50, sleep: noSleep, onPhase: (p) => phases.push(p.phase) }
    );
    // The first two never reached a relay — a different emergency from being ignored, and
    // reporting the wrong one sends an operator looking in the wrong place.
    expect(phases.filter((p) => p === 'unreachable')).toHaveLength(2);
    expect(phases).toContain('acknowledged');
  });

  it('never gives up on its own', async () => {
    const pool = fakePool({ ackOnAttempt: 99 });
    const controller = new AbortController();
    let attempts = 0;
    const run = sendDistressUntilAcknowledged(
      pool as never, ['wss://r'], secret, ourPubkey, watchtower, payload,
      {
        ackWindowMs: 5,
        sleep: async () => { if (++attempts >= 25) controller.abort(); },
        signal: controller.signal
      }
    );
    // It only stops because the operator aborted — never because it decided to.
    await expect(run).rejects.toThrow(/cancelled by the operator/);
    expect(attempts).toBeGreaterThanOrEqual(25);
  });

  it('backs off, and caps', async () => {
    const pool = fakePool({ ackOnAttempt: 99 });
    const waits: number[] = [];
    const controller = new AbortController();
    await sendDistressUntilAcknowledged(
      pool as never, ['wss://r'], secret, ourPubkey, watchtower, payload,
      {
        ackWindowMs: 1, backoffMs: 100, maxBackoffMs: 400, signal: controller.signal,
        sleep: async (ms) => { waits.push(ms); if (waits.length >= 6) controller.abort(); }
      }
    ).catch(() => {});
    expect(waits.slice(0, 4)).toEqual([100, 200, 400, 400]);
  });
});
