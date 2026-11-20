// Stages 1 to 4: Problem, Issues, Research board, Memorial.
import React, { useState } from 'react';
import { AUTHORITIES, helpsSide } from './mootAuthorities.js';
import { DRAFTS, FACTS, MEMORIAL_GUIDE_RES, MEMORIAL_SECTIONS, suggestedIssues } from './mootData.js';
import { issueFeedback, keyFactCount, keyNote, memorialChecks, memorialSummary, memorialText, words } from './mootLogic.js';
import { exportMemorial } from './exportMemorial.js';
import MemorialCheck from './MemorialCheck.jsx';
import {
  CLAY, CLAY_DARK, CLAY_DEEP, GREEN_BG, GREEN_FG, INK, LINE, LINE_SOFT, MUTED, PAPER, SOFT, STONE, SUB, SUBD, WHITE,
  btn, card, ghost, mono,
} from './ui.js';

const H2 = { margin: 0, fontSize: 24, fontWeight: 500 };
const lead = { margin: '6px 0 0', fontSize: 14, color: SUB };
const grid = (min, gap = 16) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, gap });

export function ProblemStage({ st, up, mobile }) {
  const n = keyFactCount(st.key);
  return (
    <div style={{ ...grid(260, 18), alignItems: 'start' }}>
      <div style={{ ...card, padding: mobile ? '18px 16px' : '22px 24px' }}>
        <div style={mono(10, MUTED)}>MOOT PROPOSITION · TAP A PARAGRAPH TO MARK IT AS A KEY FACT</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>This moot labels the applicant "Appellant" and the State "Respondent".</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {FACTS.map((t, i) => {
            const on = st.key.includes(i);
            return (
              <button key={i} type="button" aria-pressed={on} onClick={() => up({ key: on ? st.key.filter((x) => x !== i) : [...st.key, i] })}
                style={{ textAlign: 'left', cursor: 'pointer', border: 0, borderLeft: `3px solid ${on ? CLAY : 'transparent'}`, background: on ? SOFT : 'transparent', borderRadius: 4, padding: '8px 12px', minHeight: 44, fontSize: 15, lineHeight: 1.6, fontFamily: 'Georgia, serif', color: INK }}>
                <span style={mono(10, MUTED, { marginRight: 8 })}>¶{i + 1}</span>{t}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: mobile ? 'static' : 'sticky', top: 0 }}>
        <div style={{ background: INK, color: PAPER, borderRadius: 14, padding: 16 }}>
          <div style={mono(10, CLAY_DARK, { letterSpacing: 0 })}>KEY FACTS MARKED</div>
          <div style={{ fontSize: 30, fontWeight: 500, marginTop: 4 }}>{n} / 6</div>
          <div style={{ fontSize: 12, color: SUBD, marginTop: 4 }}>{keyNote(st.key, st.side)}</div>
        </div>
        <div style={{ ...card, borderRadius: 14, padding: 14, fontSize: 13, lineHeight: 1.55 }}>
          <div style={mono(10, MUTED)}>PARTIES</div>
          <div style={{ marginTop: 6 }}><strong style={{ fontWeight: 500 }}>Appellant:</strong> Arjun Mehra</div>
          <div><strong style={{ fontWeight: 500 }}>Respondent:</strong> State of Rajasthan</div>
          <div style={mono(10, MUTED, { marginTop: 10 })}>FORUM</div>
          <div style={{ marginTop: 6 }}>High Court of Rajasthan, under s. 482 BNSS</div>
        </div>
        <button type="button" onClick={() => up({ stage: 'issues' })} style={btn(CLAY, WHITE)}>Next: frame the issues ›</button>
      </div>
    </div>
  );
}

export function IssuesStage({ st, up }) {
  const [input, setInput] = useState('');
  const add = () => { const t = input.trim(); if (t) { up({ issues: [...st.issues, t] }); setInput(''); } };
  const fb = issueFeedback(st.issues, st.side);
  return (
    <div>
      <h2 style={H2}>Frame the issues</h2>
      <p style={lead}>{st.side === 'Res' ? 'You oppose the grant of anticipatory bail. Pick from suggestions or write your own; frame each issue as an answer to the appellant.' : 'Pick from suggestions or write your own.'} Your list is checked against the proposition.</p>
      <div style={{ ...grid(340), marginTop: 16 }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={mono(10, MUTED)}>SUGGESTED</div>
          {suggestedIssues(st.side).map((t, i) => {
            const on = st.issues.includes(i);
            return (
              <button key={i} type="button" aria-pressed={on} onClick={() => up({ issues: on ? st.issues.filter((x) => x !== i) : [...st.issues, i] })}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 8, borderRadius: 10, padding: '10px 12px', minHeight: 44, fontSize: 14, lineHeight: 1.45, background: on ? SOFT : WHITE, color: INK, border: `1px solid ${on ? CLAY : LINE}`, display: 'flex', gap: 10 }}>
                <span aria-hidden="true" style={{ color: CLAY }}>{on ? '✓' : '+'}</span>{t}
              </button>
            );
          })}
        </div>
        <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={mono(10, MUTED)}>YOUR ISSUES ({st.issues.length})</div>
          {st.issues.map((x, k) => (
            <div key={`${k}-${x}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: PAPER, borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.45 }}>
              <span style={mono(14, CLAY, { letterSpacing: 0 })}>I{k + 1}</span>
              <span style={{ flex: 1 }}>{typeof x === 'number' ? suggestedIssues(st.side)[x] : x}</span>
              <button type="button" aria-label={`Remove issue ${k + 1}`} onClick={() => up({ issues: st.issues.filter((_, j) => j !== k) })}
                style={{ border: 0, background: 'none', cursor: 'pointer', color: MUTED, minWidth: 44, minHeight: 44, margin: '-12px -12px -12px 0', fontSize: 18 }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} aria-label="Write an issue" placeholder="Write an issue: Whether…"
              style={{ flex: 1, minWidth: 0, minHeight: 44, border: `1px solid ${LINE}`, borderRadius: 8, padding: 9, fontSize: 14 }} />
            <button type="button" onClick={add} style={{ border: 0, cursor: 'pointer', background: INK, color: PAPER, borderRadius: 8, padding: '0 14px', minHeight: 44 }}>Add</button>
          </div>
          <div role="status" style={{ background: fb.warn ? SOFT : PAPER, borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.5 }}>{fb.t}</div>
        </div>
      </div>
    </div>
  );
}

export function ResearchStage({ st, up }) {
  const [rq, setRq] = useState('');
  const list = AUTHORITIES.filter((a) => !rq || `${a.name}${a.use}`.toLowerCase().includes(rq.toLowerCase()));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={H2}>Research board</h2>
          <p style={lead}>Authorities for and against you. Add the ones you'll rely on; they go into the memorial's index.{st.side === 'Res' ? ' As the State you will meet the appellant\'s authorities: read how each one is answered.' : ''}</p>
        </div>
        <input value={rq} onChange={(e) => setRq(e.target.value)} aria-label="Search authorities" placeholder="Search authorities"
          style={{ border: `1px solid ${LINE}`, background: WHITE, borderRadius: 8, padding: '9px 12px', minHeight: 44, fontSize: 14, width: 240, maxWidth: '100%' }} />
      </div>
      <div style={{ ...grid(290, 12), marginTop: 16 }}>
        {list.map((a) => {
          const on = st.used.includes(a.id);
          const mine = helpsSide(a, st.side);
          return (
            <div key={a.id} className="moot-hover" style={{ ...card, borderRadius: 14, border: `1px solid ${on ? INK : LINE}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={mono(10, mine ? GREEN_FG : CLAY_DEEP, { borderRadius: 6, padding: '3px 8px', background: mine ? GREEN_BG : SOFT, letterSpacing: '.04em' })}>{mine ? 'SUPPORTS YOU' : 'AGAINST YOU'}</span>
                <span style={mono(10, MUTED, { letterSpacing: 0 })}>{a.cite}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{a.name}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: SUB }}>{st.side === 'Res' ? a.useRes : a.use}</div>
              {!a.verified && <div style={mono(10, CLAY_DEEP, { letterSpacing: '.04em' })}>Citation being checked</div>}
              <button type="button" aria-pressed={on} onClick={() => up({ used: on ? st.used.filter((x) => x !== a.id) : [...st.used, a.id] })}
                style={{ alignSelf: 'flex-start', cursor: 'pointer', borderRadius: 8, padding: '7px 12px', minHeight: 44, fontSize: 12, background: on ? INK : WHITE, color: on ? PAPER : INK, border: `1px solid ${INK}` }}>
                {on ? '✓ In memorial' : '+ Add to memorial'}
              </button>
            </div>
          );
        })}
        {!list.length && <p style={{ fontSize: 14, color: SUB }}>No authority matches that search.</p>}
      </div>
    </div>
  );
}

export function MemorialStage({ st, up, mobile, api }) {
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const cur = MEMORIAL_SECTIONS.find((m) => m[0] === st.mem);
  const text = memorialText(st, st.mem) || '';
  const checks = memorialChecks(st, st.mem);
  const sum = memorialSummary(st);
  const hasDraft = st.side === 'App' && DRAFTS[st.mem];

  const doExport = async () => {
    setExporting(true); setExportErr('');
    try {
      await exportMemorial({ side: st.side, sections: MEMORIAL_SECTIONS.map(([k, l]) => ({ title: l, text: memorialText(st, k) || '' })) });
      up({ exported: true });
    } catch { setExportErr('The file could not be made. Try again.'); } finally { setExporting(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0,1fr)' : '220px minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, position: mobile ? 'static' : 'sticky', top: 0 }}>
        {MEMORIAL_SECTIONS.map(([k, l]) => {
          const ok = memorialChecks(st, k).every((c) => c.ok);
          const on = st.mem === k;
          return (
            <button key={k} type="button" aria-current={on ? 'true' : undefined} onClick={() => up({ mem: k })}
              style={{ textAlign: 'left', cursor: 'pointer', border: 0, borderRadius: 8, padding: '8px 10px', minHeight: 44, fontSize: 13, background: on ? INK : 'transparent', color: on ? PAPER : INK, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span>{l}</span><span aria-label={ok ? 'checks passed' : 'checks pending'} style={{ color: ok ? CLAY_DARK : '#B9BBC2' }}>{ok ? '●' : '○'}</span>
            </button>
          );
        })}
        <div style={{ marginTop: 10, background: INK, color: PAPER, borderRadius: 12, padding: 12 }}>
          <div style={mono(10, CLAY_DARK, { letterSpacing: 0 })}>FORMAT CHECK</div>
          <div style={{ fontSize: 26, fontWeight: 500 }}>{sum.passed} / {sum.total}</div>
          <div style={{ fontSize: 11, color: SUBD }}>checks passed across 8 sections</div>
        </div>
      </div>
      <div style={{ ...card, padding: mobile ? '16px' : '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 18, fontWeight: 500 }}>{cur[1]}</span>
          <span style={mono(11, MUTED, { letterSpacing: 0 })}>{words(text)} words</span>
        </div>
        <div style={{ fontSize: 13, color: SUB, lineHeight: 1.5 }}>{cur[2]}</div>
        {st.side === 'Res' && MEMORIAL_GUIDE_RES[st.mem] && <div data-testid="res-guide" style={{ fontSize: 13, color: SUB, lineHeight: 1.5, background: PAPER, borderRadius: 8, padding: '8px 10px' }}>{`For the Respondent: ${MEMORIAL_GUIDE_RES[st.mem]}`}</div>}
        <textarea value={text} onChange={(e) => up({ memT: { ...st.memT, [st.mem]: e.target.value } })} rows={12} aria-label={cur[1]}
          style={{ width: '100%', border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, fontSize: 15, lineHeight: 1.65, fontFamily: 'Georgia, serif', resize: 'vertical' }} />
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}>
          {checks.map((c) => (
            <li key={c.t} style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 999, background: c.ok ? INK : CLAY, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>{c.ok ? '✓' : '!'}</span>
              <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{c.ok ? 'Passed: ' : 'To fix: '}</span>{c.t}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" disabled={!hasDraft} onClick={() => up({ memT: { ...st.memT, [st.mem]: DRAFTS[st.mem] } })} style={ghost({ opacity: hasDraft ? 1 : 0.5 })}>Suggest a draft</button>
          <button type="button" disabled={exporting} onClick={doExport} style={btn(INK, PAPER, { borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 400 })}>
            {exporting ? 'Preparing…' : st.exported ? '✓ Exported as DOCX' : 'Export memorial (DOCX)'}
          </button>
        </div>
        {!hasDraft && <div style={{ fontSize: 12, color: MUTED }}>{st.side === 'Res' ? 'Draft suggestions are written for the Appellant only. Write this section yourself.' : 'There is no suggested draft for this section. Write it yourself.'}</div>}
        {exportErr && <div role="alert" style={{ fontSize: 13, color: CLAY_DEEP }}>{exportErr}</div>}
        <MemorialCheck st={st} up={up} api={api} />
        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 8 }}>Authorities marked "Citation being checked" are not yet confirmed against the law reports. Read each judgment before you rely on it.</div>
      </div>
    </div>
  );
}
