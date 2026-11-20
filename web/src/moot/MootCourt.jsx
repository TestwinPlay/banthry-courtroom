// Moot Court v2: seven stages, Appellant/Respondent, text and live audio hearings, scorecard.
// Built from the owner's spec (docs/design/moot-2026-10-24/Moot Court Spec.md). `mobile` is the iOS/Android app layout.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createDeviceSpeech } from '../../voice/moot/deviceSpeech.js';
import { createSarvamSpeech } from '../../voice/moot/sarvamSpeech.js';
import { isEnabled } from '../../content/capabilities.js';
import { useViewport } from '../../prep/theme.js';
import { PROBLEMS, SIDES, STAGES } from './mootData.js';
import { issueList, stageDone } from './mootLogic.js';
import { fetchModelGrade } from './modelGrade.js';
import { benchProbes, composeMemorial } from './memorialCheck.js';
import { loadMoot, sameWork, saveMoot } from './mootStore.js';
import { IssuesStage, MemorialStage, ProblemStage, ResearchStage } from './Stages.jsx';
import OralRound, { useOralRound } from './OralRound.jsx';
import LiveHearing, { useHearing } from './LiveHearing.jsx';
import Scorecard from './Scorecard.jsx';
import { CLAY, INK, LINE, MOOT_CSS, MUTED, PAPER, RAISED, STONE, WHITE, mono } from './ui.js';

const INITIAL = { prob: 'p1', side: 'App', stage: 'problem', key: [], issues: [0], used: ['arnesh'], mem: 'facts', memT: {}, exported: false, oralDone: false, liveDone: false, scoreSet: null };
const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase();

/**
 * @param {{mobile?: boolean, startStage?: string, speech?: object, api?: object, mascot?: React.ReactNode}} props
 * api: overrides the grading client (tests). When a round ends its transcript is posted for a bench assessment; the
 * on-device instant estimate shows first and stays if the assessment does not arrive.
 * userId: a signed-in student's progress is kept on this device and restored on open (mootStore.js). The caller keys this
 * component by userId, so a different student gets a fresh read. Without a userId nothing is saved.
 */
export default function MootCourt({ mobile = false, startStage, speech: speechProp, api, mascot, userId }) {
  const vp = useViewport();
  const compact = mobile || vp.mobile;
  const [voiceNote, setVoiceNote] = useState('');
  const sarvamOn = isEnabled('moot_sarvam');
  // Server-assisted voice when switched on; it falls back to the device voice by itself on any refusal or failure.
  const speech = useMemo(() => {
    if (speechProp) return speechProp;
    const device = createDeviceSpeech();
    return sarvamOn ? createSarvamSpeech({ device, onNotice: (k) => setVoiceNote(k === 'trial_exhausted' ? 'This trial\u2019s voice hearings are fully booked, so this hearing uses your device\u2019s own voice.' : '') }) : device;
  }, [speechProp, sarvamOn]);
  useEffect(() => () => { try { speech.dispose?.(); } catch { /* ignore */ } }, [speech]);
  const [saved] = useState(() => loadMoot(userId));
  // Arguing for the Respondent is behind VITE_MOOT_SIDES_ENABLED. While it is off every screen sees the Appellant, whatever a saved
  // record holds; the saved side itself is kept untouched, so switching the flag on later restores it.
  const sidesOn = isEnabled('moot_sides');
  const [st0, setSt] = useState(() => ({ ...INITIAL, ...saved?.state, prob: saved?.prob || INITIAL.prob, stage: startStage || saved?.state?.stage || (mobile ? 'live' : 'problem') }));
  // A saved Respondent round (its scores, ticks and assessment) is not shown as the Appellant's; a round argued while the switch is
  // off is the Appellant's, so finishing one makes the record the Appellant's.
  const savedResRound = st0.scoreSet && st0.scoreSet === saved?.state?.scoreSet;
  const st = sidesOn || st0.side === 'App' ? st0
    : { ...st0, side: 'App', ...(savedResRound ? { scoreSet: null, oralDone: false, liveDone: false } : {}) };
  const up = (p) => setSt((s) => {
    const n = { ...s, ...(typeof p === 'function' ? p(s) : p) };
    return !sidesOn && n.side === 'Res' && n.scoreSet && n.scoreSet !== s.scoreSet ? { ...n, side: 'App' } : n;
  });
  const sideRef = useRef(st.side);
  sideRef.current = st.side;
  const [grade, setGrade] = useState(() => saved?.grade || null);
  const [gradeState, setGradeState] = useState(() => (saved?.grade ? 'done' : saved?.gradeFailed ? 'failed' : 'idle')); // idle | loading | done | failed
  const issuesRef = useRef(st.issues);
  issuesRef.current = st.issues;
  const probRef = useRef(st.prob);
  probRef.current = st.prob;

  // Memorial-check findings put to counsel: only while they describe the memorial as it stands now.
  const probesRef = useRef([]);
  probesRef.current = st.check?.status === 'done' && st.check.text === composeMemorial(st) ? benchProbes(st.check.findings) : [];

  const round = useOralRound({
    getSide: () => sideRef.current,
    getProbes: () => probesRef.current,
    onFinish: (scores, qa) => up({ oralDone: true, scoreSet: { source: 'text', scores, qa }, stage: 'score' }),
  });
  const { h, ctrl } = useHearing({
    speech,
    getSide: () => sideRef.current,
    getProbes: () => probesRef.current,
    onFinish: (scores, log) => up((s) => (scores.length ? { liveDone: true, scoreSet: { source: 'live', scores, qa: log } } : s)),
  });
  // The assessment belongs to one round: it is requested when the round ends and dropped when the round changes.
  useEffect(() => {
    // The round saved on this device already has its assessment: show it, do not ask the bench again.
    // A round whose assessment failed is restored as failed (the Scorecard shows the on-device estimate), not asked again on every open.
    if (saved && st.scoreSet && st.scoreSet === saved.state.scoreSet && (saved.grade || saved.gradeFailed)) {
      setGrade(saved.grade); setGradeState(saved.grade ? 'done' : 'failed'); return undefined;
    }
    setGrade(null);
    if (!st.scoreSet) { setGradeState('idle'); return undefined; }
    let live = true;
    setGradeState('loading');
    fetchModelGrade({ api, side: st.side, problemId: probRef.current, qa: st.scoreSet.qa, issues: issueList(issuesRef.current, st.side).map((x) => x.t) })
      .then((g) => { if (live) { setGrade(g); setGradeState(g ? 'done' : 'failed'); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.scoreSet, api]);

  // Keep the work on this device as it changes (a round's assessment is saved once it has arrived). A screen opened and left
  // untouched writes nothing: no record means sign-out has nothing to warn about, and nothing for the next student to inherit.
  const opening = useRef(st0);
  const touched = useRef(Boolean(saved));
  useEffect(() => {
    if (!touched.current && sameWork(st0, opening.current)) return;
    touched.current = true;
    saveMoot(userId, st0, gradeState === 'done' ? grade : null, gradeState === 'failed'); // the real state: a Respondent record survives the switch being off
  }, [userId, st0, grade, gradeState]);

  const resetRounds = () => { round.reset(); ctrl.current?.reset(); };
  const setSide = (side) => {
    if (!sidesOn || side === st.side) return;
    sideRef.current = side;
    resetRounds();
    up({ side, oralDone: false, liveDone: false, scoreSet: null });
  };
  const done = stageDone({ ...st, aPh: h.phase });
  const cur = st.stage;

  const body = {
    problem: <ProblemStage st={st} up={up} mobile={compact} />,
    issues: <IssuesStage st={st} up={up} />,
    research: <ResearchStage st={st} up={up} />,
    memorial: <MemorialStage st={st} up={up} mobile={compact} api={api} />,
    oral: <OralRound side={st.side} round={round} speech={speech} />,
    live: <LiveHearing side={st.side} issues={st.issues} h={h} ctrl={ctrl} mobile={compact} onScorecard={() => up({ stage: 'score' })} />,
    score: (
      <Scorecard
        side={st.side} scoreSet={st.scoreSet} grade={grade} gradeState={gradeState} mascot={mascot} mobile={compact}
        onAgain={() => up({ stage: 'oral' })}
        onSwitch={!sidesOn ? undefined : () => { setSide(st.side === 'App' ? 'Res' : 'App'); up({ stage: 'oral' }); }}
      />
    ),
  }[cur];

  const prob = PROBLEMS.find((p) => p.id === st.prob);
  return (
    <div className="moot-v2" style={{ minHeight: compact ? 'auto' : '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, fontFamily: 'Geist, system-ui, sans-serif' }}>
      <style>{MOOT_CSS}</style>
      <header style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px', padding: compact ? '12px 14px' : '0 20px', minHeight: 60, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: compact ? '1 1 100%' : '1 1 180px' }}>
          <span style={mono(10, CLAY)}>MOOT COURT</span>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500, whiteSpace: compact ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prob.title}</h1>
        </div>
        <select aria-label="Moot problem" value={st.prob} onChange={(e) => { const p = PROBLEMS.find((x) => x.id === e.target.value); if (p?.open) up({ prob: p.id }); }}
          style={{ maxWidth: '100%', minHeight: 44, border: `1px solid ${LINE}`, background: WHITE, borderRadius: 8, padding: 8, fontSize: 13 }}>
          {PROBLEMS.map((p) => <option key={p.id} value={p.id} disabled={!p.open}>{p.open ? p.title : `${p.title} (not open yet)`}</option>)}
        </select>
        {sidesOn && <div role="group" aria-label="Your side" style={{ display: 'flex', gap: 3, background: STONE, borderRadius: 8, padding: 3 }}>
          {SIDES.map(([id, l]) => (
            <button key={id} type="button" aria-pressed={st.side === id} onClick={() => setSide(id)}
              style={{ border: 0, cursor: 'pointer', borderRadius: 6, minHeight: 44, padding: '6px 14px', fontSize: 13, color: INK, background: st.side === id ? WHITE : 'transparent', fontWeight: st.side === id ? 500 : 400 }}>{l}</button>
          ))}
        </div>}
      </header>
      <div style={{ flex: 1, display: 'flex', flexDirection: compact ? 'column' : 'row', minHeight: 0 }}>
        <nav aria-label="Moot stages" style={{
          width: compact ? '100%' : 220, flexShrink: 0, borderRight: compact ? 0 : `1px solid ${LINE}`, borderBottom: compact ? `1px solid ${LINE}` : 0,
          padding: compact ? '8px 10px' : '14px 10px', display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 4, background: RAISED, overflowX: 'auto',
          position: compact ? 'sticky' : 'sticky', top: 0, zIndex: 5, alignSelf: compact ? 'stretch' : 'flex-start', maxHeight: compact ? undefined : '100vh', overflowY: compact ? 'visible' : 'auto',
        }}>
          {STAGES.map(([id, l, d], i) => {
            const on = cur === id; const ok = done[id];
            return (
              <button key={id} type="button" aria-current={on ? 'step' : undefined} onClick={() => up({ stage: id })}
                style={{ flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'left', cursor: 'pointer', border: 0, borderRadius: 10, minHeight: 44, padding: compact ? '7px 10px' : '10px 12px', display: 'flex', gap: 10, alignItems: 'center', background: on ? INK : 'transparent', color: on ? PAPER : INK }}>
                <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 999, border: `1.5px solid ${ok ? CLAY : on ? PAPER : '#C9C7BE'}`, background: ok ? CLAY : 'transparent', color: ok ? WHITE : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist Mono', monospace", fontSize: 11, flexShrink: 0 }}>{ok ? '✓' : i + 1}</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14 }}>{l}{ok && <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> (complete)</span>}</span>
                  {!compact && <span style={{ fontSize: 11, opacity: 0.7 }}>{d}</span>}
                </span>
              </button>
            );
          })}
          {!compact && (
            <div style={{ marginTop: 'auto', background: WHITE, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.5 }}>
              <div style={mono(10, CLAY)}>ROUND · {today()}</div>
              Oral round practice is open now.
            </div>
          )}
        </nav>
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', padding: compact ? '16px 14px 40px' : '24px 26px 60px' }}>
            {voiceNote && cur === 'live' && <p role="status" style={{ margin: '0 0 10px', fontSize: 13, color: MUTED }}>{voiceNote}</p>}
            {body}
          </div>
        </main>
      </div>
    </div>
  );
}
