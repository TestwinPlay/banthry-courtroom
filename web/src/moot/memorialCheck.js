// Memorial stage helpers: compose the text that is checked, map an uploaded document onto the eight sections, call the
// check, and turn the top findings into bench questions. The findings come from POST /moot/memorial/check (Banthrystudent);
// authority findings carry the corpus resolver's wording and are never restated here as right or wrong.
import { isEnabled } from '../../content/capabilities';
import apiService from '../../services/apiService';
import { FACTS, MEMORIAL_SECTIONS } from './mootData.js';
import { memorialText } from './mootLogic.js';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MIN_CHECK_CHARS = 40;
const KIND_LABEL = { fact: 'FACT', procedure: 'PROCEDURE', authority: 'AUTHORITY', structure: 'STRUCTURE' };
export const kindLabel = (k) => KIND_LABEL[k] || 'CHECK';
export const checksOnline = () => isEnabled('moot');

/** The numbered proposition the facts are checked against. */
export const problemTextFor = () => FACTS.map((t, i) => `¶${i + 1} ${t}`).join('\n');

/** The memorial as the checker reads it: each non-empty section under its heading. */
export function composeMemorial(st) {
  return MEMORIAL_SECTIONS.map(([k, title]) => [title, (memorialText(st, k) || '').trim()]).filter(([, t]) => t).map(([title, t]) => `${title}\n${t}`).join('\n\n');
}

// Heading words for an uploaded document, by section id (same ids as MEMORIAL_SECTIONS).
const HEADS = [
  ['cover', /^(?:cover(?:\s+page)?|title\s+page)$/i],
  ['index', /^(?:(?:index|table)\s+of\s+authorities)$/i],
  ['juris', /^(?:statement\s+of\s+)?jurisdiction$/i],
  ['facts', /^(?:statement\s+of\s+)?facts$/i],
  ['issues', /^(?:statement\s+of\s+)?issues?(?:\s+(?:raised|presented|framed))?$/i],
  ['summary', /^summary\s+of\s+arguments?$/i],
  ['args', /^(?:arguments?(?:\s+advanced)?|body\s+of\s+arguments)$/i],
  ['prayer', /^prayer(?:\s+for\s+relief)?$/i],
];

/** Best effort: split extracted text on its section headings. Returns {sectionId: text} (empty when no heading is found). */
export function splitUploaded(text) {
  const out = {};
  let cur = null;
  for (const line of String(text || '').split(/\r?\n/)) {
    const head = line.trim().replace(/^[#*\s]*(?:(?:\d+|[ivx]+)[.)]\s*)?/i, '').replace(/[:.*\s]*$/, '');
    const hit = head.length <= 40 ? HEADS.find(([, re]) => re.test(head)) : null;
    if (hit && hit[0] !== cur) { cur = hit[0]; out[cur] = out[cur] ?? ''; continue; }
    if (cur) out[cur] = `${out[cur]}${out[cur] ? '\n' : ''}${line}`;
  }
  for (const k of Object.keys(out)) { out[k] = out[k].trim(); if (!out[k]) delete out[k]; }
  return out;
}

/** Reasons a chosen file is refused before upload, or null. */
export function fileProblem(file) {
  if (!file) return 'Choose a PDF or Word file.';
  const okType = /\.(pdf|docx)$/i.test(file.name || '') || ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
  if (!okType) return 'Only PDF and Word (.docx) files are supported.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Files must be under 20 MB.';
  if (file.size <= 0) return 'The file is empty.';
  return null;
}

const KINDS = ['fact', 'procedure', 'authority', 'structure'];
const SEV = ['high', 'medium', 'low'];
/** Valid findings only; anything malformed is dropped rather than shown. */
export function normalizeFindings(r) {
  if (!Array.isArray(r?.findings)) return null;
  const findings = r.findings
    .filter((f) => f && KINDS.includes(f.kind) && SEV.includes(f.severity) && typeof f.problem === 'string' && f.problem && typeof f.fix === 'string' && typeof f.quote === 'string')
    .map((f) => ({ kind: f.kind, severity: f.severity, quote: f.quote, problem: f.problem, fix: f.fix }));
  return { findings, modelChecked: r.modelChecked === true };
}

/** Normalised result or null (the rule checks on the page still apply). */
export async function runMemorialCheck({ api = apiService, side, problemId, memorial }) {
  if (!checksOnline() || typeof api?.checkMootMemorial !== 'function' || memorial.trim().length < MIN_CHECK_CHARS) return null;
  try { return normalizeFindings(await api.checkMootMemorial({ side, problemId, problemText: problemTextFor(), memorialText: memorial })); } catch { return null; }
}

// ---- Findings become bench questions ----
const sentence1 = (t) => (t.match(/^.*?[.!?](?=\s|$)/)?.[0] || t).trim();
const q140 = (t) => (t.length > 140 ? `${t.slice(0, 140).trim()}…` : t);

/** One question in the bench's voice for a fact, procedure or authority finding; null for structure/low (not bench matters). */
export function findingQuestion(f) {
  if (f.severity === 'low' || !f.quote) return null;
  const quote = q140(f.quote.replace(/\s+/g, ' ').trim());
  if (f.kind === 'fact') return `Counsel, your memorial says "${quote}". ${f.problem} Which is it?`;
  if (f.kind === 'procedure') return `Counsel, your memorial says "${quote}". ${f.problem} How do you reconcile that?`;
  if (f.kind === 'authority') return `Counsel, you rely on ${quote}. ${sentence1(f.problem)} Where does that judgment support you?`;
  return null;
}

/** At most two bench questions from the most serious findings (high before medium; fact, procedure, authority). */
export function benchProbes(findings, max = 2) {
  const sev = (f) => SEV.indexOf(f.severity);
  return [...(findings || [])]
    .sort((a, b) => sev(a) - sev(b) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
    .map(findingQuestion).filter(Boolean).slice(0, max);
}

/** The questions a hearing asks: probes first, then the scripted ones, never more than `total`. */
export const hearingQuestions = (probes, scripted, total = 3) => [...(probes || []).slice(0, 2), ...scripted].slice(0, total);
