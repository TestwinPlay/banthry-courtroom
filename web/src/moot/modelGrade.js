// Bench assessment for the Scorecard. The hearing runs on the device, so the transcript is posted to POST /moot/grade
// (Banthrystudent: criteria contract of PR #655 plus judgeComments, perAnswer, citations). Anything missing, malformed or
// failing returns null and the on-device "Instant estimate" stands. Never clamps a score.
import { isEnabled } from '../../content/capabilities';
import apiService from '../../services/apiService';

const INT10 = (n) => Number.isInteger(n) && n >= 0 && n <= 10;
const MAX_TURNS = 6;
const MAX_TEXT = 2000;

/** What the corpus resolver said, in plain words. Never "wrong" or "fabricated": a miss only means our library lacks it. */
export const VERDICT_LABEL = {
  verified: 'Found in our judgment library',
  citation_mismatch: 'Citation does not match the case named',
  ambiguous: 'Several matches, could not pin down',
  not_found: 'Not in our judgment library',
  found_externally: 'Found outside our library, holding unchecked',
  unavailable: 'Not checked',
};

/** Valid graded response or null. Rejects, never clamps. */
export function normalizeGrade(r) {
  const c = r?.criteria;
  if (!Array.isArray(c) || c.length !== 5) return null;
  if (!c.every((x) => x && typeof x.name === 'string' && x.name && INT10(x.score))) return null;
  if (new Set(c.map((x) => x.name)).size !== 5) return null;
  const jc = r.judgeComments;
  if (!Array.isArray(jc) || jc.length !== 3 || !jc.every((t) => typeof t === 'string' && t.trim())) return null;
  const pa = r.perAnswer;
  const perAnswer = Array.isArray(pa) && pa.length && pa.every((row) => Array.isArray(row) && row.length === 5 && row.every(INT10)) ? pa : null;
  // A citation shows only with a verdict the resolver can give; anything else is dropped rather than guessed.
  const citations = (Array.isArray(r.citations) ? r.citations : []).filter((x) => x && typeof x.text === 'string' && VERDICT_LABEL[x.verdict]).map((x) => ({ text: x.text, verdict: x.verdict }));
  return {
    criteria: c.map((x) => ({ name: x.name, score: x.score })),
    overall: typeof r.overall === 'number' && r.overall >= 0 && r.overall <= 10 ? r.overall : null,
    tip: typeof r.tip === 'string' && r.tip ? r.tip : null,
    judgeComments: jc.map((t) => t.trim()),
    perAnswer,
    citations,
  };
}

/** The request body: side code, problem id, 1-6 turns of at most 2000 characters, and the student's issues. */
export function gradeBody({ side, problemId, qa, issues }) {
  const transcript = (qa || []).slice(0, MAX_TURNS).map((x) => ({ q: String(x.q || '').slice(0, MAX_TEXT), a: String(x.a || '').slice(0, MAX_TEXT) }));
  const list = (issues || []).filter((t) => typeof t === 'string' && t.trim()).slice(0, 12).map((t) => t.slice(0, 300));
  return { side, problemId, transcript, ...(list.length ? { issues: list } : {}) };
}

/**
 * Null (the instant estimate stands) unless the moot capability is on, there are real answers, and the response passes
 * normalizeGrade. Sample answers (typed in when the microphone failed) are not the student's words and are never graded.
 * @param {{api?: object, side: 'App'|'Res', problemId: string, qa: {q: string, a: string, sim?: boolean}[], issues?: string[]}} o
 */
export async function fetchModelGrade({ api = apiService, side, problemId, qa, issues }) {
  if (!qa?.length || qa.some((x) => x.sim) || !isEnabled('moot') || typeof api?.gradeMootHearing !== 'function') return null;
  try { return normalizeGrade(await api.gradeMootHearing(gradeBody({ side, problemId, qa, issues }))); } catch { return null; }
}
