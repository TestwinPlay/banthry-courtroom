import { describe, expect, it } from 'vitest';
import { benchProbes, fileProblem, findingQuestion, hearingQuestions, normalizeFindings, splitUploaded } from './memorialCheck.js';

const F = (o) => ({ kind: 'fact', severity: 'high', quote: 'aged 52', problem: 'The problem says he is 34 (¶1).', fix: 'Use 34.', ...o });

describe('splitUploaded', () => {
  it('maps headings (numbered, upper case, with colons) onto the eight section ids', () => {
    const r = splitUploaded('MEMORIAL\n1. STATEMENT OF FACTS:\nHe is 34.\n\nIssues Raised\nWhether bail.\n\nPRAYER FOR RELIEF\nRelease him.');
    expect(r).toEqual({ facts: 'He is 34.', issues: 'Whether bail.', prayer: 'Release him.' });
  });
  it('returns nothing when no heading is found', () => expect(splitUploaded('just a long paragraph of text')).toEqual({}));
});

describe('fileProblem', () => {
  const f = (name, size, type = '') => ({ name, size, type });
  it('accepts PDF and DOCX up to 20 MB', () => { expect(fileProblem(f('m.pdf', 1000))).toBeNull(); expect(fileProblem(f('m.docx', 20 * 1024 * 1024))).toBeNull(); });
  it('refuses other types, empty, and over 20 MB', () => {
    expect(fileProblem(f('m.png', 10))).toMatch(/PDF and Word/);
    expect(fileProblem(f('m.pdf', 20 * 1024 * 1024 + 1))).toMatch(/20 MB/);
    expect(fileProblem(f('m.pdf', 0))).toMatch(/empty/);
    expect(fileProblem(null)).toBeTruthy();
  });
});

describe('normalizeFindings', () => {
  it('keeps well-formed findings and drops malformed ones', () => {
    const r = normalizeFindings({ findings: [F(), { kind: 'magic', severity: 'high', quote: '', problem: 'x', fix: 'y' }, F({ severity: 'huge' }), F({ problem: '' })], modelChecked: true });
    expect(r.findings).toHaveLength(1);
    expect(r.modelChecked).toBe(true);
  });
  it('is null for a bad shape', () => expect(normalizeFindings({ answer: 'x' })).toBeNull());
});

describe('findings to bench questions', () => {
  it('phrases a fact finding as the bench would', () => {
    expect(findingQuestion(F())).toBe('Counsel, your memorial says "aged 52". The problem says he is 34 (¶1). Which is it?');
  });
  it('uses only the resolver sentence for an authority and never calls it wrong', () => {
    const q = findingQuestion(F({ kind: 'authority', severity: 'medium', quote: 'Made Up v. Nobody', problem: 'Not in our judgment library. Our library holds Supreme Court judgments only.' }));
    expect(q).toBe('Counsel, you rely on Made Up v. Nobody. Not in our judgment library. Where does that judgment support you?');
    expect(q).not.toMatch(/fabricat|fake|wrong/i);
  });
  it('asks nothing for structure, low severity or an empty quote', () => {
    expect(findingQuestion(F({ kind: 'structure' }))).toBeNull();
    expect(findingQuestion(F({ severity: 'low' }))).toBeNull();
    expect(findingQuestion(F({ quote: '' }))).toBeNull();
  });
  it('takes at most two, most serious first (high, then fact before procedure before authority)', () => {
    const p = benchProbes([F({ kind: 'authority', severity: 'medium', quote: 'A v. B', problem: 'Not in our judgment library.' }), F({ kind: 'procedure', severity: 'medium', quote: 'Supreme Court of India', problem: 'Not in the problem.' }), F({ quote: 'aged 52' }), F({ kind: 'structure' })]);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatch(/aged 52/);
    expect(p[1]).toMatch(/Supreme Court of India/);
  });
  it('probes go before the scripted questions and the hearing is still three questions', () => {
    expect(hearingQuestions(['P1', 'P2', 'P3'], ['S1', 'S2', 'S3'])).toEqual(['P1', 'P2', 'S1']);
    expect(hearingQuestions(['P1'], ['S1', 'S2', 'S3'])).toEqual(['P1', 'S1', 'S2']);
    expect(hearingQuestions([], ['S1', 'S2', 'S3'])).toEqual(['S1', 'S2', 'S3']);
  });
});
