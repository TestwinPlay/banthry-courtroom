// Pure rules for Moot Court: per-answer scoring, issue coverage, judge reactions, memorial checks, stage completion.
// The scoring is the spec's on-device heuristic (Moot Court Spec.md section 4). It is instant and offline; model grading,
// when the backend can serve it, is shown beside it (see modelGrade.js), never instead of it silently.
import {
  ACKNOWLEDGEMENTS, CORE_ISSUES, CRITERIA, ISSUE_KEYWORDS, JUDGE_COMMENTS, JUDGE_COMMENT_AUTHORITY_RES, MEMORIAL_SECTIONS, KEY_FACTS,
  QUASH_ISSUE, suggestedIssues, COVER, JURISDICTION,
} from './mootData.js';
import { AUTHORITIES, helpsSide } from './mootAuthorities.js';

export const words = (t) => ((t || '').trim() ? t.trim().split(/\s+/).length : 0);
const r1 = (x) => Math.round(x * 10) / 10;

const SCORED_AUTHORITIES = ['arnesh', 'sushila', 'sibbia', 'antil', 'chidambaram', '482', '35'];

/** Five scores [reasoning, authority, answers, structure, manner], each 0 to 10, one decimal. */
export function scoreText(t) {
  const L = (t || '').toLowerCase();
  const auth = SCORED_AUTHORITIES.filter((w) => L.includes(w)).length;
  const len = words(t);
  const r = Math.min(10, 4 + Math.min(3, len / 25) + auth);
  const a = Math.min(10, 3 + auth * 2.2);
  const q = Math.min(10, (/my lord|your lordship/.test(L) ? 8 : 6) + (len > 20 ? 1 : 0));
  const s = Math.min(10, 5 + (/first|second|because|therefore/.test(L) ? 2 : 0) + Math.min(2, len / 40));
  const m = /condition|passport|cooperat/.test(L) ? 9 : 6.5;
  return [r, a, q, s, m].map(r1);
}

/** Mean of each criterion over a list of score arrays (zeros when empty). */
export const averages = (scores) => CRITERIA.map((_, i) => (scores.length ? scores.reduce((a, sc) => a + sc[i], 0) / scores.length : 0));
export const overallOf = (avg) => avg.reduce((a, b) => a + b, 0) / avg.length;
export const fmt = (n) => n.toFixed(1);

/** What the bench says after an answer. `qi` is the zero-based question number. */
export function reactionFor(sc, qi) {
  if (sc[1] < 6) return 'Counsel, you have not cited any authority. Which judgment supports you?';
  if (sc[2] < 7) return 'Answer the question first, counsel. Then make your point.';
  return ACKNOWLEDGEMENTS[qi] || ACKNOWLEDGEMENTS[0];
}

/** Issues as { t, kw }: suggested ones carry their keywords, custom ones use their own words longer than 5 letters. */
export const issueList = (issues, side = 'App') => issues.map((x) => (typeof x === 'number'
  ? { t: suggestedIssues(side)[x], kw: ISSUE_KEYWORDS[x] }
  : { t: x, kw: x.toLowerCase().split(/\W+/).filter((w) => w.length > 5) }));

/** Which issues the spoken answers so far cover. Returns booleans in issue order. */
export function coverage(issues, answers) {
  const all = answers.join(' ').toLowerCase();
  return issueList(issues).map((x) => x.kw.some((k) => all.includes(k)));
}

const NOTE_AUTHORS = ['Arnesh Kumar', 'Sushila Aggarwal', 'Sibbia', 'Antil', 'Chidambaram'];
/** Bench notes from the answers: [{ ok, t }]. `sim` marks answers that were samples rather than the student's own words. */
export function benchNotes(log) {
  return log.flatMap((l, k) => {
    const L = l.a.toLowerCase();
    const n = `Q${k + 1}`;
    const out = [];
    if (l.sim) out.push({ ok: null, t: `${n}: sample answer used, not your own words` });
    const cited = NOTE_AUTHORS.filter((x) => L.includes(x.toLowerCase().split(' ')[0]));
    out.push(cited.length ? { ok: true, t: `${n}: cited ${cited.join(', ')}` } : { ok: false, t: `${n}: no authority cited` });
    if (/my lord/.test(L)) out.push({ ok: true, t: `${n}: addressed the bench properly` });
    if (/condition|passport|undertake/.test(L)) out.push({ ok: true, t: `${n}: offered conditions` });
    return out;
  });
}

export function verdict(overall, avg) {
  if (overall >= 8) return 'Ready for the round. You cite early and keep answers short.';
  if (overall >= 6) return `A solid round. Your weakest area is ${CRITERIA[avg.indexOf(Math.min(...avg))].toLowerCase()}.`;
  return 'Keep practising. Lead with the authority and answer the question asked.';
}

/** One comment per judge, taken from the weakest three criteria (J1 the weakest). */
export function judgeComments(avg, side = 'App') {
  const order = avg.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 3);
  return order.map(([v, i], j) => ({ k: `J${j + 1}`, t: side === 'Res' && i === 1 && v >= 7 ? JUDGE_COMMENT_AUTHORITY_RES : JUDGE_COMMENTS[i][v >= 7 ? 1 : 0] }));
}

// ---- Problem and issues ----
export const keyFactCount = (key) => key.filter((k) => KEY_FACTS.includes(k)).length;
export function keyNote(key, side = 'App') {
  if (!key.length) return 'Start with what helps and what hurts your side.';
  const bg = key.some((k) => !KEY_FACTS.includes(k)) ? 'Some marked facts are background only. ' : '';
  return bg + (keyFactCount(key) >= 4 ? 'Good: you have the facts that decide the case.' : (side === 'Res' ? 'Look for the police seeking custody, the refusal below and the witness allegation.' : 'Look for cooperation, the witness allegation and the time-limit point.'));
}
export function issueFeedback(issues, side = 'App') {
  if (issues.includes(QUASH_ISSUE)) return { warn: true, t: 'Quashing is outside this application: the court is hearing anticipatory bail, not a petition to quash (quashing lies under s. 528 BNSS, not s. 482). Drop issue on quashing.' };
  if (CORE_ISSUES.every((i) => issues.includes(i))) return { warn: false, t: 'Strong list. It covers custody, the time limit and conditions, which are the three points the bench will press.' };
  return { warn: false, t: `You are missing: ${CORE_ISSUES.filter((i) => !issues.includes(i)).map((i) => `"${suggestedIssues(side)[i].replace(/^Whether |^What /, '').slice(0, 50)}…"`).join(', ')}` };
}

// ---- Memorial ----
export const usedAuthorities = (used) => AUTHORITIES.filter((a) => used.includes(a.id));
export function memorialDefaults({ side, issues, used }) {
  return {
    cover: COVER[side], index: usedAuthorities(used).map((a, i) => `${i + 1}. ${a.name}, ${a.cite}`).join('\n'), juris: JURISDICTION,
    facts: '', issues: issues.map((i, k) => `${k + 1}. ${typeof i === 'number' ? suggestedIssues(side)[i] : i}`).join('\n'),
    summary: '', args: '', prayer: '',
  };
}
export const memorialText = (st, k) => st.memT[k] ?? memorialDefaults(st)[k];

/** Rule checks for one memorial section: [{ ok, t }]. */
export function memorialChecks(st, k) {
  const t = memorialText(st, k) || '';
  const used = usedAuthorities(st.used);
  if (k === 'facts') {
    return [
      { ok: words(t) >= 60, t: 'At least 60 words' },
      { ok: !/\b(clearly|obviously|illegal)\b/i.test(t), t: 'Neutral tone: no arguing in the facts' },
      { ok: /joined|investigation/i.test(t), t: 'Mentions he joined the investigation (¶3)' },
    ];
  }
  if (k === 'index') {
    return [
      { ok: used.length >= 3, t: 'Three or more authorities added from research' },
      { ok: used.some((a) => !helpsSide(a, st.side)), t: 'Includes an adverse authority you will distinguish' },
    ];
  }
  if (k === 'prayer') {
    return st.side === 'Res'
      ? [{ ok: /dismiss|reject|refus/i.test(t), t: 'Asks the court to reject the application' }, { ok: /condition/i.test(t), t: 'Offers conditions in the alternative' }]
      : [{ ok: /bail|release/i.test(t), t: 'Asks for release on bail in the event of arrest' }, { ok: /condition/i.test(t), t: 'Offers conditions' }];
  }
  if (k === 'args') {
    return [
      { ok: /arnesh|sushila|sibbia|antil|chidambaram/i.test(t), t: 'Cites at least one authority' },
      { ok: words(t) >= 120, t: 'At least 120 words' },
    ];
  }
  return [{ ok: words(t) > 5, t: 'Section is filled' }];
}
export function memorialSummary(st) {
  const all = MEMORIAL_SECTIONS.flatMap(([k]) => memorialChecks(st, k));
  return { passed: all.filter((c) => c.ok).length, total: all.length };
}

// ---- Stage completion (spec section 3) ----
export function stageDone(st) {
  const m = memorialSummary(st);
  return {
    problem: st.key.length >= 4,
    issues: st.issues.length >= 3,
    research: st.used.length >= 3,
    memorial: m.passed >= m.total - 3,
    oral: !!st.oralDone,
    live: st.aPh === 'done',
    score: !!(st.oralDone || st.liveDone),
  };
}
