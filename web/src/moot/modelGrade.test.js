import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchModelGrade, gradeBody, normalizeGrade } from './modelGrade.js';

const ok = {
  criteria: ['a', 'b', 'c', 'd', 'e'].map((name, i) => ({ name, score: i + 4 })), overall: 6, tip: 'Cite early.',
  judgeComments: ['One.', 'Two.', 'Three.'], perAnswer: [[1, 2, 3, 4, 5]], citations: [{ text: 'X v. Y', verdict: 'not_found' }],
};
afterEach(() => vi.unstubAllEnvs());

describe('normalizeGrade (#655 criteria plus judgeComments, perAnswer, citations)', () => {
  it('accepts a valid response', () => expect(normalizeGrade(ok)).toEqual(ok));
  it('drops a bad perAnswer and unknown verdicts instead of failing', () => {
    const r = normalizeGrade({ ...ok, perAnswer: [[1, 2]], citations: [{ text: 'A v. B', verdict: 'fabricated' }, { text: 'X v. Y', verdict: 'verified' }] });
    expect(r.perAnswer).toBeNull();
    expect(r.citations).toEqual([{ text: 'X v. Y', verdict: 'verified' }]);
  });
  it.each([
    ['too few criteria', { ...ok, criteria: ok.criteria.slice(0, 4) }],
    ['score out of range', { ...ok, criteria: [...ok.criteria.slice(0, 4), { name: 'e', score: 11 }] }],
    ['fractional score', { ...ok, criteria: [...ok.criteria.slice(0, 4), { name: 'e', score: 4.5 }] }],
    ['duplicate names', { ...ok, criteria: [...ok.criteria.slice(0, 4), { name: 'a', score: 4 }] }],
    ['two judge comments', { ...ok, judgeComments: ['One.', 'Two.'] }],
    ['no judge comments (old /feedback shape)', { ...ok, judgeComments: undefined }],
    ['markdown only', { answer: '## feedback' }],
  ])('rejects %s', (_n, r) => expect(normalizeGrade(r)).toBeNull());
});

describe('gradeBody', () => {
  it('caps turns at 6 and text at 2000, and omits empty issues', () => {
    const qa = Array.from({ length: 8 }, () => ({ q: 'q'.repeat(3000), a: 'a'.repeat(3000) }));
    const b = gradeBody({ side: 'Res', problemId: 'p1', qa, issues: ['  ', ''] });
    expect(b.transcript).toHaveLength(6);
    expect(b.transcript[0].a).toHaveLength(2000);
    expect(b).not.toHaveProperty('issues');
  });
});

describe('fetchModelGrade falls back silently', () => {
  const qa = [{ q: 'Q', a: 'A' }];
  const o = { side: 'App', problemId: 'p1', qa, issues: ['Whether bail?'] };
  const api = (fn) => ({ gradeMootHearing: fn });
  it('does nothing without the capability, answers, or with sample answers', async () => {
    const fn = vi.fn(async () => ok);
    vi.stubEnv('VITE_CAP_MOOT', 'false');
    expect(await fetchModelGrade({ ...o, api: api(fn) })).toBeNull();
    vi.stubEnv('VITE_CAP_MOOT', 'true');
    expect(await fetchModelGrade({ ...o, api: api(fn), qa: [] })).toBeNull();
    expect(await fetchModelGrade({ ...o, api: api(fn), qa: [{ q: 'Q', a: 'A', sim: true }] })).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });
  it('posts the transcript; null on error or bad shape', async () => {
    vi.stubEnv('VITE_CAP_MOOT', 'true');
    const fn = vi.fn(async () => ok);
    expect(await fetchModelGrade({ ...o, api: api(fn) })).toEqual(ok);
    expect(fn).toHaveBeenCalledWith({ side: 'App', problemId: 'p1', transcript: [{ q: 'Q', a: 'A' }], issues: ['Whether bail?'] });
    expect(await fetchModelGrade({ ...o, api: api(async () => { throw new Error('503'); }) })).toBeNull();
    expect(await fetchModelGrade({ ...o, api: api(async () => ({ answer: 'md' })) })).toBeNull();
  });
});
