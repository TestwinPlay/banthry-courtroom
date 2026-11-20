// Moot Court progress kept on this device, so a reload, or a phone that kills the web view, does not lose the work.
// One record per signed-in student and problem, in localStorage. The `bth.` prefix is what sign-out and account deletion
// erase (services/deviceStorage.js), so the next person on the device sees none of it. Nothing is sent to the server.
// Kept: side, stage, marked facts, issues, research board, memorial text, and a finished round with its bench assessment.
// Not kept: a round or hearing still in progress (its clock and microphone cannot be resumed), so that one starts again.
// Everything read back is checked (known stage, side and memorial section; fact and issue numbers that exist; strings where
// strings belong); a field that fails is left out, so a corrupt or hand-edited record cannot crash the screen. Storage that is blocked or
// full means nothing is saved, and the screen works as it did.
import { FACTS, MEMORIAL_SECTIONS, PROBLEMS, STAGES, SUGGESTED_ISSUES } from './mootData.js';
import { normalizeGrade } from './modelGrade.js';

const PREFIX = 'bth.moot.v2.';
const recordKey = (userId, prob) => `${PREFIX}${userId}.${prob}`;
const lastKey = (userId) => `${PREFIX}${userId}.last`;

const isArr = (x) => Array.isArray(x);
const isStr = (x) => typeof x === 'string';
const isIndex = (n, len) => Number.isInteger(n) && n >= 0 && n < len; // a position in a list that exists
const isScoreRow = (r) => isArr(r) && r.length === 5 && r.every((n) => Number.isFinite(n) && n >= 0 && n <= 10);

function cleanScoreSet(x) {
  if (!x || typeof x !== 'object') return null;
  if (x.source !== 'text' && x.source !== 'live') return null;
  if (!isArr(x.scores) || !x.scores.length || !x.scores.every(isScoreRow)) return null;
  if (!isArr(x.qa) || !x.qa.every((l) => l && isStr(l.a))) return null;
  return { source: x.source, scores: x.scores, qa: x.qa.map((l) => ({ q: isStr(l.q) ? l.q : '', a: l.a, ...(l.sim ? { sim: true } : {}) })) };
}

/** The saved fields of the screen state that pass the checks, as a partial state. Unknown or invalid fields are left out. */
function cleanState(r) {
  const out = {};
  if (r.side === 'App' || r.side === 'Res') out.side = r.side;
  if (STAGES.some(([id]) => id === r.stage)) out.stage = r.stage;
  if (isArr(r.key) && r.key.every((n) => isIndex(n, FACTS.length))) out.key = r.key;
  if (isArr(r.issues) && r.issues.every((i) => (typeof i === 'number' ? isIndex(i, SUGGESTED_ISSUES.length) : isStr(i)))) out.issues = r.issues;
  if (isArr(r.used) && r.used.every(isStr)) out.used = r.used;
  if (MEMORIAL_SECTIONS.some(([id]) => id === r.mem)) out.mem = r.mem;
  if (r.memT && typeof r.memT === 'object' && !isArr(r.memT) && Object.values(r.memT).every(isStr)) out.memT = r.memT;
  if (typeof r.exported === 'boolean') out.exported = r.exported;
  if (typeof r.oralDone === 'boolean') out.oralDone = r.oralDone;
  if (typeof r.liveDone === 'boolean') out.liveDone = r.liveDone;
  const scoreSet = cleanScoreSet(r.scoreSet);
  if (scoreSet) out.scoreSet = scoreSet;
  else { out.scoreSet = null; out.oralDone = false; out.liveDone = false; } // a finished flag without its scores is not a finished round
  return out;
}

/**
 * The saved record for this student: `{ prob, state, grade }`, or null when there is none (or no signed-in student).
 * `prob` is the last problem open; `grade` is the bench assessment of the saved round, if one arrived; `gradeFailed` is true when the bench was asked and did not answer.
 */
export function loadMoot(userId) {
  if (!userId) return null;
  try {
    const prob = localStorage.getItem(lastKey(userId));
    if (!PROBLEMS.some((p) => p.id === prob && p.open)) return null;
    const raw = JSON.parse(localStorage.getItem(recordKey(userId, prob)) || 'null');
    if (!raw || typeof raw !== 'object') return null;
    const state = cleanState(raw.state || {});
    const grade = state.scoreSet ? normalizeGrade(raw.grade) : null;
    return { prob, state, grade, gradeFailed: Boolean(state.scoreSet && !grade && raw.gradeFailed === true) };
  } catch { return null; }
}

// The part of the screen state that is kept.
const kept = ({ side, stage, key, issues, used, mem, memT, exported, oralDone, liveDone, scoreSet }) => ({ side, stage, key, issues, used, mem, memT, exported, oralDone, liveDone, scoreSet });

/** True when two screen states hold the same saved work (an untouched screen equals the one it opened with). */
export const sameWork = (a, b) => JSON.stringify(kept(a)) === JSON.stringify(kept(b));

/** Saves the durable part of the screen state under the open problem. Silent when storage is blocked or full. */
export function saveMoot(userId, st, grade, gradeFailed = false) {
  if (!userId) return;
  try {
    localStorage.setItem(recordKey(userId, st.prob), JSON.stringify({ v: 1, state: kept(st), grade: grade || null, gradeFailed: !grade && gradeFailed }));
    localStorage.setItem(lastKey(userId), st.prob);
  } catch { /* storage blocked or full: nothing saved, the screen carries on */ }
}
