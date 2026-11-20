// Stage 7: Scorecard.
import React from 'react';
import { CRITERIA } from './mootData.js';
import { VERDICT_LABEL } from './modelGrade.js';
import { averages, fmt, judgeComments, overallOf, verdict } from './mootLogic.js';
import { CLAY, CLAY_DARK, INK, LINE_SOFT, LINE_STRONG, MUTED, PAPER, STONE, SUB, SUBD, WHITE, btn, card, mono } from './ui.js';

function DefaultMascot({ size = 64 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#23252B', border: '2px solid #FB8A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5 }}>
      ⚖️
    </div>
  );
}

export default function Scorecard({ side = 'App', scoreSet, grade, gradeState, onAgain, onSwitch, mascot, mobile }) {
  if (!scoreSet?.scores?.length) {
    return <div style={{ ...card, border: `1px dashed ${LINE_STRONG}`, padding: 32, textAlign: 'center', fontSize: 15, color: SUB }}>Argue the oral round to see your scorecard.</div>;
  }
  // Bench assessment (graded on the whole hearing) replaces the instant estimate when it arrives; the estimate is the fallback.
  const g = grade || null;
  const names = g ? g.criteria.map((c) => c.name) : CRITERIA;
  const avg = g ? g.criteria.map((c) => c.score) : averages(scoreSet.scores);
  const overall = g && g.overall != null ? g.overall : overallOf(avg);
  const label = g ? 'BENCH ASSESSMENT' : 'INSTANT ESTIMATE';
  const comments = g ? g.judgeComments.map((t, i) => ({ k: `J${i + 1}`, t })) : judgeComments(avg, side);
  const samples = (scoreSet.qa || []).filter((x) => x.sim).length;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', background: INK, color: PAPER, borderRadius: 18, padding: mobile ? '18px 16px' : '22px 24px' }}>
        {mascot || <DefaultMascot size={mobile ? 64 : 80} />}
        <div>
          <div style={mono(10, CLAY_DARK)}>{`OVERALL · ${label}`}</div>
          <div data-testid="overall" style={{ fontSize: 56, fontWeight: 500, lineHeight: 1 }}>{fmt(overall)}<span style={{ fontSize: 20, color: SUBD }}>/10</span></div>
        </div>
        <div style={{ flex: 1, minWidth: 220, fontSize: 15, lineHeight: 1.55 }}>{g && g.tip ? g.tip : verdict(overall, avg)}</div>
      </div>
      {gradeState === 'loading' && <p role="status" style={{ margin: '10px 0 0', fontSize: 13, color: SUB }}>The bench assessment is being prepared. This is your instant estimate, scored on this device.</p>}
      {gradeState === 'failed' && <p role="status" style={{ margin: '10px 0 0', fontSize: 13, color: SUB }}>The bench assessment is not available right now, so this is your instant estimate, scored on this device.</p>}
      {samples > 0 && (
        <p role="note" style={{ margin: '10px 0 0', fontSize: 13, color: SUB }}>{samples === 1 ? '1 answer was a sample' : `${samples} answers were samples`} typed in because the microphone was not available. This score is for practice only.</p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 14, marginTop: 14 }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={mono(10, MUTED)}>CRITERIA · YOU</div>
          {names.map((l, i) => (
            <div key={l} style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{l}</span><span style={mono(13, INK, { letterSpacing: 0 })}>{g ? `${avg[i]}/10` : fmt(avg[i])}</span></div>
              <div style={{ height: 8, background: STONE, borderRadius: 4, marginTop: 6 }}><div style={{ height: '100%', width: `${avg[i] * 10}%`, background: avg[i] >= 7 ? INK : CLAY, borderRadius: 4 }} /></div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>{g ? 'Graded by the bench on your whole hearing.' : 'Instant estimate: scored on this device from keywords in your answers.'} Orange bars are below 7.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map((c) => (
            <div key={c.k} style={{ ...card, borderRadius: 14, padding: 14, display: 'flex', gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 999, background: INK, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{c.k}</span>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>{c.t}</div>
            </div>
          ))}
        </div>
      </div>
      {g && g.perAnswer && (
        <div data-testid="per-answer" style={{ ...card, padding: 18, marginTop: 14 }}>
          <div style={mono(10, MUTED)}>BY ANSWER · BENCH ASSESSMENT</div>
          {g.perAnswer.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13, padding: '8px 0', borderBottom: `1px solid ${LINE_SOFT}` }}>
              <span>{`Answer ${i + 1}`}</span>
              <span style={mono(11, INK, { letterSpacing: 0 })}>{names.map((n, k) => `${n.split(' ')[0]} ${row[k]}`).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
      {g && (
        <div data-testid="checked-citations" style={{ ...card, padding: 18, marginTop: 14 }}>
          <div style={mono(10, MUTED)}>AUTHORITIES YOU NAMED · CHECKED AGAINST OUR LIBRARY</div>
          {g.citations.length ? g.citations.map((c) => (
            <div key={c.text} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${LINE_SOFT}`, fontSize: 13, lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ color: c.verdict === 'verified' ? INK : CLAY }}>{c.verdict === 'verified' ? '✓' : '!'}</span>
              <span style={{ flex: 1 }}>{c.text}</span>
              <span style={{ color: MUTED }}>{VERDICT_LABEL[c.verdict]}</span>
            </div>
          )) : <p style={{ margin: '8px 0 0', fontSize: 13, color: SUB }}>You named no case we could check. Name each case in full, with its citation.</p>}
          <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>Our library holds Supreme Court judgments only. "Not in our judgment library" does not mean a case is wrong. Check every authority yourself before you rely on it.</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button type="button" onClick={onAgain} style={btn(CLAY, WHITE, { padding: '12px 18px' })}>Argue again</button>
        {onSwitch && <button type="button" onClick={onSwitch} style={btn(WHITE, INK, { border: '1px solid #DDDBD3', padding: '12px 18px', fontWeight: 400 })}>Switch sides and argue</button>}
      </div>
    </div>
  );
}
