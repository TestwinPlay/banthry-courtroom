// Stage 6: Live audio hearing (two-way). The bench speaks, the student answers aloud, captions are always on.
// The state machine is in hearingController.js; this file is the screen and the hook that owns the controller.
import React, { useEffect, useRef, useState } from 'react';
import { CRITERIA, JUDGES, SIDE_LABEL } from './mootData.js';
import { averages, benchNotes, coverage, fmt, issueList, overallOf } from './mootLogic.js';
import { MIC_NOTES, SIM_NOTES, createHearing, initialHearing } from './hearingController.js';
import {
  CLAY, CLAY_DARK, DARK_LINE, DIM, INK, LINE_SOFT, LINE_STRONG, MUTED, PAPER, STONE, SUB, SUBD, WHITE, card, mono,
} from './ui.js';

/** Owns the hearing controller for the life of the screen; destroying it cancels speech, recognition and timers. */
export function useHearing({ speech, getSide, getProbes, onFinish }) {
  const [h, setH] = useState(initialHearing);
  const ctrl = useRef(null);
  const cb = useRef({ getSide, getProbes, onFinish });
  cb.current = { getSide, getProbes, onFinish };
  useEffect(() => {
    const c = createHearing({ speech, getSide: () => cb.current.getSide(), getProbes: () => cb.current.getProbes?.() || [], onChange: setH, onFinish: (sc, log) => cb.current.onFinish(sc, log) });
    ctrl.current = c;
    return () => c.destroy();
  }, [speech]);
  return { h, ctrl };
}

const STATUS = { idle: 'NOT STARTED', judge: 'BENCH SPEAKING', listen: 'LISTENING', think: 'BENCH CONFERS', done: 'HEARING OVER' };
const dark = { background: DARK_LINE, borderRadius: 14 };
const pill = (bg, fg, extra) => ({ cursor: 'pointer', borderRadius: 999, background: bg, color: fg, ...extra });

function Wave({ on }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 3, alignItems: 'center', height: 22 }}>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} style={{ width: 3, height: 22, borderRadius: 2, background: on ? CLAY_DARK : '#4A4D55', transformOrigin: 'center', transform: 'scaleY(.25)', animation: on ? `mWave ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.05}s infinite` : 'none' }} />
      ))}
    </span>
  );
}

export default function LiveHearing({ side, issues, h, ctrl, mobile, onScorecard }) {
  const { phase } = h;
  const c = ctrl.current;
  const speechCanListen = !!c?.canListen;
  const answers = h.log.map((l) => l.a);
  const issuesL = issueList(issues, side);
  const cov = coverage(issues, answers);
  const avg = averages(h.sc);
  const overall = h.sc.length ? fmt(overallOf(avg)) : '—';
  const notes = benchNotes(h.log);
  const lastNote = notes.length ? notes[notes.length - 1].t : '';
  const speaking = phase === 'judge' ? h.who : null;
  const covN = `${cov.filter(Boolean).length} / ${issuesL.length} covered`;
  const showSim = phase === 'listen' && h.sample;
  const [alert, setAlert] = useState('');
  useEffect(() => { setAlert(`${STATUS[phase].toLowerCase()}`); }, [phase]);

  const critRows = (small) => CRITERIA.map((l, i) => (
    <div key={l} style={{ marginTop: small ? 6 : 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, fontSize: small ? 10 : 13, color: small ? SUBD : INK }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
        <span style={mono(small ? 10 : 13, small ? PAPER : INK, { letterSpacing: 0 })}>{h.sc.length ? fmt(avg[i]) : '—'}</span>
      </div>
      <div style={{ height: small ? 4 : 7, background: small ? INK : STONE, borderRadius: 4, marginTop: small ? 3 : 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${avg[i] * 10}%`, background: small ? CLAY_DARK : avg[i] >= 7 ? INK : CLAY, transition: 'width .6s ease' }} />
      </div>
    </div>
  ));
  const noteList = (
    <>
      {notes.map((n, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${LINE_SOFT}`, fontSize: 13, lineHeight: 1.45 }}>
          <span aria-hidden="true" style={{ color: n.ok === false ? CLAY : INK }}>{n.ok === false ? '!' : n.ok ? '✓' : '·'}</span>{n.t}
        </div>
      ))}
      {!notes.length && <p style={{ fontSize: 13, color: SUB, margin: '10px 0 0' }}>Notes appear as you answer: authorities cited, whether you answered the question, conditions offered.</p>}
    </>
  );

  return (
    <div>
      <div className="moot-dark" style={{ background: INK, color: PAPER, borderRadius: 20, position: 'relative', padding: mobile ? '18px 16px' : '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={mono(10, CLAY_DARK)}>LIVE AUDIO HEARING · TWO-WAY</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 500 }}>The bench speaks. You answer out loud.</h2>
          </div>
          <span role="status" aria-label={`Hearing status: ${STATUS[phase]}`} style={mono(10, phase === 'judge' ? INK : WHITE, { marginLeft: 'auto', whiteSpace: 'nowrap', borderRadius: 999, padding: '5px 10px', background: phase === 'listen' ? CLAY : phase === 'judge' ? CLAY_DARK : DARK_LINE })}>
            {phase === 'listen' && h.typing ? 'TYPING' : phase === 'listen' && h.real ? 'LISTENING · MIC' : STATUS[phase]}
          </span>
          <span style={mono(24, PAPER, { letterSpacing: 0 })}>{phase === 'listen' ? `0:${String(h.left).padStart(2, '0')}` : `Q ${Math.min(3, h.qi + 1)}/3`}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px,5vw,56px)', padding: '8px 0' }}>
          {JUDGES.map(([k, l]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ width: mobile ? 56 : 72, height: mobile ? 56 : 72, borderRadius: 999, background: speaking === k ? CLAY_DARK : DARK_LINE, color: speaking === k ? INK : PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 500, transform: `scale(${speaking === k ? 1.12 : 1})`, transition: 'transform .3s, background .3s', animation: speaking === k ? 'mGlow 1.4s infinite' : 'none' }}>{k}</span>
              <span style={{ fontSize: 12, color: SUBD }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ ...dark, padding: '16px 18px', minHeight: 86 }}>
          <div style={mono(10, SUBD)}>{speaking ? ({ J1: 'PRESIDING JUDGE', J2: 'JUDGE 2', J3: 'JUDGE 3' })[speaking] : 'BENCH'}</div>
          <div data-testid="caption" style={{ fontSize: mobile ? 17 : 19, lineHeight: 1.5, marginTop: 6 }}>
            {h.cap || (phase === 'idle' ? 'Three judges will question you aloud. Turn your sound on. Answer by speaking; your words appear below and are assessed live.' : '…')}
          </div>
        </div>
        <div style={{ border: `1px solid ${phase === 'listen' ? CLAY_DARK : DARK_LINE}`, borderRadius: 14, padding: '16px 18px', minHeight: 86, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={mono(10, CLAY_DARK, { whiteSpace: 'nowrap' })}>YOU · {SIDE_LABEL[side]}</span>
            <Wave on={phase === 'listen' && h.recording && (h.level == null || h.level > 0)} />
          </div>
          {phase === 'listen' ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <textarea
              data-testid="heard"
              aria-label="Your answer. Speak and your words appear here, or type."
              value={h.heard}
              onChange={(e) => c.type(e.target.value)}
              placeholder={h.micIssue ? 'Type your answer… start with "My Lords"' : h.recording ? 'Listening… speak, or type here. Start with "My Lords"' : 'Tap Speak to talk, or type your answer here. Start with "My Lords"'}
              rows={mobile ? 5 : 4}
              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', color: PAPER, border: 0, outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: 17, lineHeight: 1.55, padding: 0 }}
            />
            <button
              type="button"
              data-testid="mic"
              onClick={() => c.toggleMic()}
              disabled={!speechCanListen || h.stopping}
              aria-pressed={!!h.recording}
              aria-label={!speechCanListen ? 'Speaking is not available on this device' : h.stopping ? 'Finishing the recording' : h.recording ? 'Stop the microphone' : 'Start the microphone'}
              style={pill(h.recording ? CLAY : 'transparent', h.recording ? WHITE : PAPER, { border: h.recording ? 0 : '1px solid #4A4D55', minWidth: 48, minHeight: 48, padding: '0 14px', fontSize: 13, flexShrink: 0, opacity: !speechCanListen || h.stopping ? 0.5 : 1, animation: h.recording ? 'mGlow 1.6s infinite' : 'none' })}
            >
              {h.stopping ? 'Finishing…' : h.recording ? '■ Stop' : '🎙 Speak'}
            </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div data-testid="heard" style={{ fontSize: 17, lineHeight: 1.55, color: h.heard ? PAPER : DIM, flex: 1, minWidth: 0 }}>
                {h.heard || (phase === 'judge' || phase === 'think' ? 'Your answer appears here. The microphone opens when the bench finishes.' : 'Your answer appears here.')}
              </div>
              {(phase === 'judge' || phase === 'think') && (
                <button type="button" data-testid="mic-idle" disabled aria-label="The microphone opens when the bench finishes" style={pill('transparent', PAPER, { border: '1px solid #4A4D55', minWidth: 48, minHeight: 48, padding: '0 14px', fontSize: 13, flexShrink: 0, opacity: 0.5 })}>🎙 Speak</button>
              )}
            </div>
          )}
          {phase === 'listen' && h.micIssue && !h.heard && (
            <div data-testid="mic-note" role="status" style={{ fontSize: 12, color: SUBD, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{MIC_NOTES[h.micIssue] || MIC_NOTES.default}</span>
              {h.micIssue !== 'silent' && <button type="button" onClick={() => c.useSample()} style={pill('transparent', PAPER, { border: '1px solid #4A4D55', padding: '8px 12px', minHeight: 44, fontSize: 12 })}>Use a sample answer</button>}
            </div>
          )}
          {showSim && <div data-testid="sim-note" role="status" style={{ fontSize: 11, color: SUBD }}><strong style={{ fontWeight: 600, color: PAPER }}>SAMPLE ANSWER. </strong>{SIM_NOTES.sample}</div>}
        </div>
        {mobile && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
              <div style={{ ...dark, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={mono(9, SUBD)}>ISSUES</span><span style={mono(11, CLAY_DARK, { letterSpacing: 0 })}>{covN}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {issuesL.map((x, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11, lineHeight: 1.35 }}>
                      <span aria-label={cov[i] ? 'covered' : 'not yet covered'} style={{ width: 14, height: 14, borderRadius: 999, background: cov[i] ? CLAY : LINE_STRONG, color: cov[i] ? WHITE : INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0, transition: 'background .4s' }}>{cov[i] ? '✓' : '·'}</span>
                      <span style={{ color: STONE, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{x.t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...dark, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={mono(9, SUBD)}>ASSESSMENT</span><span style={{ fontSize: 18, fontWeight: 500 }}>{overall}</span></div>
                {critRows(true)}
              </div>
            </div>
            {lastNote && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', ...dark, borderRadius: 12, padding: '10px 12px', fontSize: 12, lineHeight: 1.45 }}>
                <span style={mono(9, CLAY_DARK, { paddingTop: 2, flexShrink: 0 })}>BENCH NOTE</span><span>{lastNote}</span>
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {phase === 'idle' && <button type="button" onClick={() => c.start()} style={pill(CLAY_DARK, INK, { border: 0, padding: '14px 26px', minHeight: 48, fontSize: 15, fontWeight: 500 })}>Rise and begin the hearing</button>}
          {phase === 'listen' && <button type="button" onClick={() => c.done()} disabled={!h.heard.trim()} style={pill(CLAY, WHITE, { border: 0, padding: '14px 26px', minHeight: 48, fontSize: 15, fontWeight: 500, opacity: h.heard.trim() ? 1 : 0.5, animation: h.heard.trim() ? 'mGlow 1.6s infinite' : 'none' })}>Send answer</button>}
          {phase === 'listen' && <button type="button" onClick={() => c.repeat()} style={pill('transparent', PAPER, { border: '1px solid #4A4D55', padding: '13px 18px', minHeight: 48, fontSize: 14 })}>Repeat the question</button>}
          {phase !== 'idle' && phase !== 'done' && <button type="button" onClick={() => c.end()} style={pill('transparent', PAPER, { border: '1px solid #4A4D55', padding: '13px 18px', minHeight: 48, fontSize: 14 })}>End hearing</button>}
          {phase === 'done' && (
            <>
              <button type="button" onClick={() => c.start()} style={pill(CLAY_DARK, INK, { border: 0, padding: '13px 22px', minHeight: 48, fontSize: 14, fontWeight: 500 })}>Argue again</button>
              <button type="button" onClick={onScorecard} style={pill('transparent', PAPER, { border: `1px solid ${PAPER}`, padding: '13px 18px', minHeight: 48, fontSize: 14 })}>Open scorecard</button>
            </>
          )}
        </div>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }} aria-live="polite">{alert}</span>
      </div>

      {mobile ? (
        <div style={{ ...card, marginTop: 12, padding: 16 }}>
          <div style={mono(10, MUTED)}>ALL BENCH NOTES</div>
          {noteList}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14, marginTop: 14 }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={mono(10, MUTED)}>ISSUES · LIVE</span><span style={mono(11, INK, { letterSpacing: 0 })}>{covN}</span></div>
            {issuesL.map((x, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: `1px solid ${LINE_SOFT}`, fontSize: 14, lineHeight: 1.45 }}>
                <span aria-label={cov[i] ? 'covered' : 'not yet covered'} style={{ width: 20, height: 20, borderRadius: 999, background: cov[i] ? CLAY : LINE_STRONG, color: cov[i] ? WHITE : INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, transition: 'background .4s' }}>{cov[i] ? '✓' : '·'}</span>
                <span style={{ color: cov[i] ? INK : MUTED }}>{x.t}</span>
              </div>
            ))}
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={mono(10, MUTED)}>ASSESSMENT · LIVE</span><span style={{ fontSize: 26, fontWeight: 500 }}>{overall}<span style={{ fontSize: 13, color: MUTED }}>/10</span></span></div>
            {critRows(false)}
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div style={mono(10, MUTED)}>BENCH NOTES</div>
            {noteList}
          </div>
        </div>
      )}
    </div>
  );
}
