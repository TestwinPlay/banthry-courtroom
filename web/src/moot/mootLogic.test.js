import { describe, expect, it } from 'vitest';
import {
  averages, benchNotes, coverage, issueFeedback, judgeComments, keyNote, memorialChecks, memorialSummary, overallOf, reactionFor, scoreText, stageDone, verdict,
} from './mootLogic.js';
import { AUTHORITIES } from './mootAuthorities.js';
import { DICTATION_SAMPLE, DRAFTS, FACTS, SAMPLE_ANSWERS } from './mootData.js';

describe('scoreText (spec section 4: [reasoning, authority, answers, structure, manner])', () => {
  // Worked by hand from the spec table: r = 4 + min(3, words/25) + authorities, a = 3 + 2.2 x authorities,
  // q = 8 if it addresses the bench else 6 (+1 over 20 words), s = 5 + 2 (first/second/because/therefore) + min(2, words/40),
  // m = 9 for conditions/passport/cooperation else 6.5. Each rounded to one decimal.
  it.each([
    ['empty answer', '', [4, 3, 6, 5, 6.5]],
    ['reference answer 1: cites Arnesh Kumar, 44 words (r 4+1.76+1, s 5+1.1)', SAMPLE_ANSWERS.App[0], [6.8, 5.2, 9, 6.1, 6.5]],
    ['reference answer 2: conditions, no authority, 32 words', SAMPLE_ANSWERS.App[1], [5.3, 3, 9, 5.8, 9]],
    ['reference answer 3: Sushila Aggarwal and passport', SAMPLE_ANSWERS.App[2], [6.2, 5.2, 9, 5.7, 9]],
    ['two authorities in five words (482 and 35)', 'Section 482 and 35 apply.', [6.2, 7.4, 6, 5.1, 6.5]],
  ])('%s', (_n, text, want) => expect(scoreText(text)).toEqual(want));

  it('caps every criterion at 10', () => {
    const big = `My Lord, first, because Arnesh Sushila Sibbia Antil Chidambaram 482 35 condition ${'word '.repeat(200)}`;
    expect(scoreText(big)).toEqual([10, 10, 9, 9, 9]);
  });
  it('"your lordship" counts as addressing the bench', () => expect(scoreText('Your Lordship may see.')[2]).toBe(8));
  it('structure words add two points', () => expect(scoreText('First, a point.')[3]).toBe(7.1));
  it('overall is the mean of the five criteria', () => {
    expect(overallOf(averages([[4, 3, 6, 5, 6.5], [6, 5, 8, 7, 9.5]]))).toBeCloseTo((5 + 4 + 7 + 6 + 8) / 5, 5);
    expect(averages([])).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('judge reactions', () => {
  it.each([
    [[6, 3, 9, 6, 6], 0, 'Counsel, you have not cited any authority. Which judgment supports you?'],
    [[6, 5.9, 9, 6, 6], 2, 'Counsel, you have not cited any authority. Which judgment supports you?'],
    [[6, 7.4, 6, 6, 6], 0, 'Answer the question first, counsel. Then make your point.'],
    [[6, 7.4, 9, 6, 6], 0, 'Noted, counsel.'],
    [[6, 7.4, 9, 6, 6], 1, 'Yes. That is helpful.'],
    [[6, 7.4, 9, 6, 6], 2, 'Very well.'],
  ])('%j at question %i', (sc, qi, want) => expect(reactionFor(sc, qi)).toBe(want));
});

describe('issue coverage', () => {
  const issues = [0, 1, 2, 3, 'Whether the passport surrender suffices as security']; // four suggested, one custom
  it('covers an issue when any of its keywords appears in the answers so far', () => {
    expect(coverage(issues, [])).toEqual([false, false, false, false, false]);
    expect(coverage(issues, ['He is entitled to anticipatory bail'])).toEqual([true, false, false, false, false]);
    expect(coverage(issues, ['custody is not needed', 'Sushila Aggarwal settles it'])).toEqual([false, true, true, false, false]);
    expect(coverage(issues, ['he will accept a condition'])[3]).toBe(true);
  });
  it('a custom issue uses its own words longer than 5 letters', () => {
    expect(coverage(['Whether the passport surrender suffices'], ['the passport is with the police'])).toEqual([true]);
    expect(coverage(['Whether the passport surrender suffices'], ['he will pay'])).toEqual([false]);
    expect(coverage(['Is it fair'], ['anything at all'])).toEqual([false]); // no word over 5 letters: never covered
  });
});

describe('problem and issue feedback', () => {
  it('warns about background-only facts and nudges toward the deciding ones', () => {
    expect(keyNote([])).toMatch(/Start with what helps/);
    expect(keyNote([0, 1])).toBe('Some marked facts are background only. Look for cooperation, the witness allegation and the time-limit point.');
    expect(keyNote([2, 3, 4, 5])).toBe('Good: you have the facts that decide the case.');
  });
  it('flags quashing as out of scope', () => expect(issueFeedback([0, 4]).warn).toBe(true));
  it('praises a list with the three core issues, else lists what is missing', () => {
    expect(issueFeedback([1, 2, 3]).t).toMatch(/^Strong list/);
    expect(issueFeedback([0, 1]).t).toBe('You are missing: "protection, if granted, should end on filing of th…", "conditions are adequate to address the risk of con…"');
  });
});

describe('bench notes, verdict, judge comments', () => {
  it('notes authorities, address, conditions and sample answers', () => {
    const notes = benchNotes([{ a: 'My Lords, under Arnesh Kumar he accepts conditions', sim: false }, { a: 'No idea', sim: true }]).map((n) => n.t);
    expect(notes).toEqual(['Q1: cited Arnesh Kumar', 'Q1: addressed the bench properly', 'Q1: offered conditions', 'Q2: sample answer used, not your own words', 'Q2: no authority cited']);
  });
  it('verdict bands at 8 and 6, naming the weakest criterion in the middle band', () => {
    expect(verdict(8.2, [8, 8, 8, 8, 9])).toMatch(/^Ready for the round/);
    expect(verdict(6.5, [7, 3, 8, 7, 7])).toBe('A solid round. Your weakest area is use of authority.');
    expect(verdict(5.9, [6, 6, 6, 6, 6])).toMatch(/^Keep practising/);
  });
  it('gives one comment per judge from the three weakest criteria, weakest to J1', () => {
    const c = judgeComments([8, 3, 8, 8, 5]);
    expect(c.map((x) => x.k)).toEqual(['J1', 'J2', 'J3']);
    expect(c[0].t).toMatch(/did not cite any authority/); // authority is weakest
    expect(c[1].t).toMatch(/offer concrete conditions/); // manner second
    expect(judgeComments([9, 9, 9, 9, 9])[0].t).toBe('Your reasoning moves in clear steps.');
  });
});

const base = { side: 'App', issues: [0], used: [], memT: {}, key: [], oralDone: false, liveDone: false, aPh: 'idle' };
describe('memorial rules', () => {
  const facts = `The Appellant joined the investigation twice. ${'He produced documents. '.repeat(20)}`;
  it('facts: 60 words, neutral tone, mentions the investigation', () => {
    expect(memorialChecks({ ...base, memT: { facts } }, 'facts').map((c) => c.ok)).toEqual([true, true, true]);
    expect(memorialChecks({ ...base, memT: { facts: 'Clearly illegal.' } }, 'facts').map((c) => c.ok)).toEqual([false, false, false]);
  });
  it('index: three authorities including an adverse one (adverse flips with the side)', () => {
    const three = { ...base, used: ['arnesh', 'sushila', 'sibbia'] };
    expect(memorialChecks(three, 'index').map((c) => c.ok)).toEqual([true, false]);
    expect(memorialChecks({ ...three, used: ['arnesh', 'sushila', 'chid'] }, 'index').map((c) => c.ok)).toEqual([true, true]);
    expect(memorialChecks({ ...three, side: 'Res', used: ['chid', 'sushila', 'sibbia'] }, 'index').map((c) => c.ok)).toEqual([true, true]);
  });
  it('index and issues fill themselves from earlier stages', () => {
    const st = { ...base, used: ['arnesh'], issues: [0, 'My own issue'] };
    expect(memorialChecks(st, 'issues')[0].ok).toBe(true);
    expect(memorialChecks({ ...st, issues: [] }, 'issues')[0].ok).toBe(false);
  });
  it('args: cites an authority and 120 words; prayer: release and conditions', () => {
    const args = `Arnesh Kumar governs. ${'word '.repeat(120)}`;
    expect(memorialChecks({ ...base, memT: { args } }, 'args').map((c) => c.ok)).toEqual([true, true]);
    expect(memorialChecks({ ...base, memT: { prayer: 'Release on bail with conditions.' } }, 'prayer').map((c) => c.ok)).toEqual([true, true]);
    expect(memorialChecks({ ...base, side: 'Res', memT: { prayer: 'Reject the application.' } }, 'prayer').map((c) => c.ok)).toEqual([true, false]);
  });
  it('totals 8 sections of checks', () => expect(memorialSummary(base).total).toBe(1 + 2 + 1 + 3 + 1 + 1 + 2 + 2));
});

describe('stage completion rules (spec section 3)', () => {
  const full = {
    ...base, key: [2, 3, 4, 5], issues: [1, 2, 3], used: ['arnesh', 'sushila', 'chid'], oralDone: true, aPh: 'done',
    memT: { facts: `joined the investigation ${'x '.repeat(70)}`, summary: 'a summary here ok', args: `arnesh ${'w '.repeat(130)}`, prayer: 'release on bail with conditions', cover: 'cover text here', juris: 'juris text here ok' },
  };
  it('nothing is done at the start (the default issue and authority alone do not tick)', () => {
    expect(Object.values(stageDone({ ...base, used: ['arnesh'] })).some(Boolean)).toBe(false);
  });
  it('problem: at least 4 facts marked (any facts)', () => {
    expect(stageDone({ ...base, key: [0, 1, 2] }).problem).toBe(false);
    expect(stageDone({ ...base, key: [0, 1, 2, 3] }).problem).toBe(true);
  });
  it('issues: 3 or more; research: 3 or more authorities', () => {
    expect(stageDone({ ...base, issues: [1, 2] }).issues).toBe(false);
    expect(stageDone({ ...base, issues: [1, 2, 'x'] }).issues).toBe(true);
    expect(stageDone({ ...base, used: ['arnesh', 'sibbia'] }).research).toBe(false);
    expect(stageDone({ ...base, used: ['arnesh', 'sibbia', 'antil'] }).research).toBe(true);
  });
  it('memorial: all but 3 checks pass', () => {
    const total = memorialSummary(full).total;
    expect(memorialSummary(full).passed).toBeGreaterThanOrEqual(total - 3);
    expect(stageDone(full).memorial).toBe(true);
    expect(stageDone({ ...full, memT: {} }).memorial).toBe(false);
  });
  it('oral: 3 answers submitted; live: hearing done; scorecard: any round finished', () => {
    expect(stageDone(full)).toMatchObject({ problem: true, issues: true, research: true, memorial: true, oral: true, live: true, score: true });
    expect(stageDone({ ...full, oralDone: false, aPh: 'listen' })).toMatchObject({ oral: false, live: false, score: false });
    expect(stageDone({ ...full, oralDone: false, liveDone: true }).score).toBe(true);
    expect(stageDone({ ...full, oralDone: true, aPh: 'idle' })).toMatchObject({ oral: true, live: false, score: true });
  });
});

describe('authorities data', () => {
  it('only Sushila (SCC page unconfirmed) stays unverified; every authority has a use line for both sides', () => {
    expect(AUTHORITIES).toHaveLength(6);
    for (const a of AUTHORITIES) expect(a).toMatchObject({ verified: a.id !== 'sushila', use: expect.any(String), useRes: expect.any(String) });
    expect(AUTHORITIES.find((a) => a.id === 'sushila').cite).not.toMatch(/SCC/);
  });
  it('carries the review corrections: no s. 482 factors, s. 318(4), no appeal, Antil binds the police', () => {
    const text = JSON.stringify([AUTHORITIES, FACTS, DRAFTS, SAMPLE_ANSWERS, DICTATION_SAMPLE]);
    expect(text).not.toMatch(/factors|need to arrest|appeals to the High|Section 318 of|dismiss the appeal/i);
    expect(FACTS[1]).toMatch(/s\. 318\(4\) BNS/);
    expect(AUTHORITIES.find((a) => a.id === 'antil').use).toMatch(/courts must check compliance/);
    expect(SAMPLE_ANSWERS.Res[2]).toMatch(/Sushila Aggarwal permits/);
  });
  it('the Respondent hears a Respondent-side authority comment', () => {
    expect(judgeComments([9, 9, 9, 9, 9], 'Res')[1].t).toMatch(/Good use of Chidambaram/);
    expect(judgeComments([9, 9, 9, 9, 9], 'App')[1].t).toMatch(/Good use of Arnesh Kumar/);
  });
  it('includes an adverse authority for the appellant', () => expect(AUTHORITIES.some((a) => a.stance === 'Res')).toBe(true));
});
