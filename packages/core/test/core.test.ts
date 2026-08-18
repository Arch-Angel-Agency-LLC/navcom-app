import { describe, expect, it } from 'vitest';

import { deriveWeight, ageInDays, known, unknown } from '../src/attestation';
import { newSecretKey, publicKeyOf, secretFromHex, secretToHex } from '../src/crypto/keys';
import { open, seal } from '../src/crypto/envelope';
import { buildWatchStateEvent, capabilitySentence, darkState, publishableWatchState, readWatchState } from '../src/events/watch-state';
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
  const base = {
    state: 'automated-oncall' as const, holder: 'Mecha Jono', holder_kind: 'agent' as const,
    pageableOnCall: 2, since: NOW_S, agent_health: 'ok' as const,
    last_drill: { at: NOW_S - 86400, result: 'pass' as const }
  };

  it('publishes automated-oncall when the ladder is proven and reachable', () => {
    expect(publishableWatchState(base).state).toBe('automated-oncall');
  });

  it('demotes to automated when nobody is pageable right now', () => {
    expect(publishableWatchState({ ...base, pageableOnCall: 0 }).state).toBe('automated');
  });

  it('demotes to automated when no drill has ever passed', () => {
    expect(publishableWatchState({ ...base, last_drill: null }).state).toBe('automated');
    expect(publishableWatchState({ ...base, last_drill: { at: 1, result: 'fail' } }).state).toBe('automated');
  });

  it('never demotes station — a human is present regardless of drills', () => {
    const s = publishableWatchState({ ...base, state: 'station', holder_kind: 'human', last_drill: null, pageableOnCall: 0 });
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
    expect(capabilitySentence(publishableWatchState({ ...base, pageableOnCall: 0 })))
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
    type: 'answer', responder: 'Raven', responder_kind: 'human', text: 'Open until 22:00', provenance
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
