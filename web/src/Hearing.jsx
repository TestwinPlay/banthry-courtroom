import React, { useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase.js';
import { Logo } from './Login.jsx';
import { useCourt, CUT_IN_SECS } from './useCourt.js';
import { getCaseById, generateCaseFromJudgment } from './services/apiService.js';

const SERIF = "'Instrument Serif', 'Times New Roman', Georgia, serif";
const SANS = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

const WHO = { J1: 'J1 · PRESIDING', J2: 'J2 · SENIOR PUISNE', J3: 'J3 · JUNIOR PUISNE', OC: 'LEARNED PP', ADV: 'YOU', W: 'WITNESS', CLERK: 'COURT MASTER' };
const CAPTION = { J1: "Hon'ble Presiding Judge", J2: "Hon'ble Senior Puisne Judge", J3: "Hon'ble Junior Puisne Judge", OC: 'Learned Public Prosecutor', ADV: 'You · live', W: 'Witness', CLERK: 'Court Master' };
const SAMPLES = {
  Applicant: 'My Lords, the s. 35(3) notice was never served on the Applicant. It was merely affixed on a door, and every record the State needs was seized on 18 March. Custodial interrogation serves no purpose, as Arnesh Kumar v. State of Bihar makes clear.',
  State: 'My Lords, the invoice entries were edited from the Applicant’s own login on 10 March 2025. ₹1.6 crore went to a firm linked to her brother-in-law. Custodial interrogation is needed to trace the money, as held in P. Chidambaram v. Directorate of Enforcement.',
};
const CRITERIA = [
  ['legal_reasoning', 'Reasoning'], ['use_of_authority', 'Authorities'], ['responsiveness', 'Responsiveness'],
  ['handling_difficult_questions', 'Under pressure'], ['structure', 'Structure'], ['court_manner', 'Court manner'], ['advocacy', 'Delivery'],
];

const pill = (on) => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 14px', borderRadius: 999, border: 0,
  background: on ? '#F3EEE5' : 'transparent', color: on ? '#100E0C' : '#CFC7BA', fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: 'pointer',
});
const roundBtn = (on) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', border: 0,
  background: on ? '#F3EEE5' : '#2A2520', color: on ? '#100E0C' : '#F3EEE5', cursor: 'pointer',
});
const input = {
  minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid rgba(243, 238, 229, 0.18)', background: '#100E0C',
  color: '#F3EEE5', fontFamily: SANS, fontSize: 14, width: '100%',
};
const label = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#B5ADA0' };
const closeBtn = (light) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: 0,
  background: light ? '#E6DFD2' : '#2A2520', color: light ? '#14120F' : '#F3EEE5', cursor: 'pointer', flex: 'none',
});
const X = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function witnessesFrom(c, side) {
  return (c?.witnesses || []).map((w, i) => {
    const state = /investigat|police|officer|inspector|prosecut/i.test(`${w.role} ${w.name}`);
    const ours = side === 'State' ? state : !state;
    return { id: `W-${i + 1}`, name: w.name, role: w.role, says: w.statement, side: ours ? 'YOUR WITNESS' : side === 'State' ? 'DEFENCE WITNESS' : 'STATE WITNESS' };
  });
}

export function Hearing({ user }) {
  const court = useCourt();
  const [mootCase, setMootCase] = useState(null);
  const [caseError, setCaseError] = useState('');
  const [side, setSide] = useState('Applicant');
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [drawer, setDrawer] = useState(null);
  const [recTab, setRecTab] = useState('Facts');
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [custom, setCustom] = useState([]);
  const [called, setCalled] = useState(null);
  const [wForm, setWForm] = useState({ name: '', role: '', says: '' });
  const [tendered, setTendered] = useState([]);
  const [aForm, setAForm] = useState({ title: '', file: '' });
  const [upload, setUpload] = useState({ busy: false, msg: '' });
  const transcriptEnd = useRef(null);

  useEffect(() => { getCaseById('default').then(setMootCase).catch(() => setCaseError('Could not load the moot problem. Refresh to try again.')); }, []);
  useEffect(() => {
    if (!court.connected) return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [court.connected]);
  useEffect(() => { transcriptEnd.current?.scrollIntoView({ block: 'nearest' }); }, [court.entries.length]);

  const begin = () => { setStarted(true); setElapsed(0); court.start({ side, caseId: mootCase?.id || 'default' }); };

  const onJudgment = async (file) => {
    if (!file) return;
    setUpload({ busy: true, msg: `Reading ${file.name} and drafting a fictional moot problem…` });
    try {
      const c = await generateCaseFromJudgment({ file, topic: 'Anticipatory bail under Section 482 BNSS' });
      setMootCase(c); setTendered([]); setCustom([]);
      setUpload({ busy: false, msg: `New moot problem ready: ${c.title}` });
    } catch (e) {
      setUpload({ busy: false, msg: e.message || 'Could not read that judgment. Try a PDF, DOCX or TXT file.' });
    }
  };

  // ---- Derived view state -------------------------------------------------
  const sp = court.speaking;
  const allW = useMemo(() => witnessesFrom(mootCase, side).concat(custom), [mootCase, side, custom]);
  const calledW = allW.find((w) => w.id === called);
  const chips = court.entries.flatMap((e) => e.chips || []);
  const verified = chips.filter((c) => c.ok).length;
  const flagged = chips.filter((c) => !c.ok).length;
  const lastChip = chips[chips.length - 1];
  const secs = Math.min(court.counselSecs, CUT_IN_SECS);
  const hot = court.counselSecs >= CUT_IN_SECS - 5;
  const ringColor = hot ? '#E0582F' : '#8FDDAE';
  const counselLive = court.recording && (sp === 'ADV' || court.level > 0.05);
  const benchSpeaking = sp && sp !== 'ADV';
  const parties = mootCase?.parties || { applicant: 'Applicant', respondent: 'The State' };

  const micStatus = !started ? 'Choose your side and begin the hearing'
    : !court.connected ? (court.evaluating ? 'Hearing closed' : 'Connecting to the courtroom…')
    : court.leave ? 'Leave granted — go ahead, briefly'
    : benchSpeaking ? 'Bench speaking · your mic is held'
    : !court.recording ? 'Mic off — tap to speak, or type'
    : hot ? `Past 0:${CUT_IN_SECS - 5} — the Bench may cut in`
    : `You have the floor · Bench may cut in at 0:${CUT_IN_SECS - 5}`;

  const record = {
    Facts: (mootCase?.proposition_paragraphs || []).map((p, i) => ({ n: `¶${p.para_no || i + 1}`, text: p.text })),
    Issues: (mootCase?.issues || []).map((t, i) => ({ n: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i] || String(i + 1), text: t })),
    Exhibits: (mootCase?.exhibit_prompts || []).map((e) => ({ n: '—', text: `${e.id} · ${e.title}` })),
    Provisions: (mootCase?.statutes || []).map((t) => ({ n: '—', text: t })),
  };
  const annexes = (mootCase?.exhibit_prompts || []).map((e) => ({ id: e.id, title: e.title, status: 'On record', tendered: false }))
    .concat(tendered.map((a) => ({ ...a, status: `Tendered at ${a.at} · taken on record subject to objection`, tendered: true })));

  const toggle = (name) => setDrawer((d) => (d === name ? null : name));
  const ring = (id) => (sp === id ? '#F08A62' : 'transparent');
  const glow = (id) => (sp === id ? 'bc-glow 1.6s ease-out infinite' : 'none');
  const plate = (id) => ({ background: sp === id ? '#F3EEE5' : 'rgba(12, 10, 9, 0.72)', color: sp === id ? '#100E0C' : '#CFC7BA' });

  const callOrRelease = (w) => {
    if (called === w.id) { setCalled(null); court.releaseWitness(w); return; }
    setCalled(w.id);
    court.callWitness(w);
  };
  const addWitness = (e) => {
    e.preventDefault();
    const w = { id: `W-${allW.length + 1}`, name: wForm.name.trim() || 'New witness', role: wForm.role.trim() || `Witness for the ${side}`, says: wForm.says.trim(), side: 'YOUR WITNESS' };
    setCustom((c) => [...c, w]);
    setWForm({ name: '', role: '', says: '' });
    setCalled(w.id);
    court.callWitness(w);
  };
  const tenderDoc = (e) => {
    e.preventDefault();
    const a = { id: `A-${tendered.length + 1}`, title: (aForm.title || aForm.file || 'Untitled document').trim(), at: mmss(elapsed) };
    setTendered((t) => [...t, a]);
    setAForm({ title: '', file: '' });
    court.tender(a);
  };
  const submitDraft = (e) => { e.preventDefault(); court.submit(draft); setDraft(''); };

  if (court.scorecard || court.evaluating) {
    return <ScorecardView court={court} mootCase={mootCase} onAgain={() => window.location.reload()} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: SANS, fontSize: 15, lineHeight: 1.5, WebkitFontSmoothing: 'antialiased' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 20px', padding: '12px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', minWidth: 0 }}>
          <a href="/" aria-label="Banthry Courtroom home" style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}><Logo /></a>
          <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.1 }}>{parties.applicant} <em style={{ color: '#F08A62' }}>v.</em> {parties.respondent}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 30, padding: '0 12px', borderRadius: 999, background: '#1F1B17', fontSize: 13, color: '#CFC7BA' }}>
            Anticipatory bail · you appear for the {side === 'Applicant' ? 'Applicant' : 'State'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {court.connected && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '0 14px', borderRadius: 999, background: 'rgba(229, 83, 58, 0.16)', color: '#FF9F8A', fontFamily: MONO, fontSize: 13 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5533A', animation: 'bc-pulse 1.6s ease-in-out infinite' }} />Live · {mmss(elapsed)}
            </span>
          )}
          <div role="group" aria-label="Court tools" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: 999, background: '#1F1B17' }}>
            <button type="button" aria-pressed={drawer === 'record'} onClick={() => toggle('record')} style={pill(drawer === 'record')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" /><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg>Moot problem
            </button>
            <button type="button" aria-pressed={drawer === 'witness'} onClick={() => toggle('witness')} style={pill(drawer === 'witness')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>Witness box
            </button>
            <button type="button" aria-pressed={drawer === 'annex'} onClick={() => toggle('annex')} style={pill(drawer === 'annex')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>Annexures
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: '#C2421C', color: '#FFFFFF', fontSize: 11, fontWeight: 600 }}>{annexes.length}</span>
            </button>
          </div>
          <button type="button" onClick={() => signOut(auth)} title={user.email || ''} style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1px solid rgba(243, 238, 229, 0.22)', background: 'transparent', color: '#F3EEE5', fontFamily: SANS, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
          <button type="button" disabled={!started} onClick={() => court.rest(mootCase)} style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: 0, background: '#C2421C', color: '#FFFFFF', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: started ? 'pointer' : 'not-allowed', opacity: started ? 1 : 0.5 }}>Rest case</button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 16, padding: '0 20px 20px', minHeight: 0 }}>
        <main style={{ flex: '999 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section aria-label="The courtroom" style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', aspectRatio: started ? '1200 / 560' : undefined, minHeight: started ? 300 : 460, background: '#1A1410', boxShadow: '0 0 0 1px rgba(243, 238, 229, 0.08)' }}>
            <CourtroomArt />
            {[['J2', '27.67%', '37.5%', '5.4%'], ['J1', '50%', '33.2%', '6%'], ['J3', '72.33%', '37.5%', '5.4%']].map(([id, left, top, w]) => (
              <span key={id} aria-hidden="true" style={{ position: 'absolute', left, top, width: w, aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', border: `2px solid ${ring(id)}`, animation: glow(id) }} />
            ))}
            {[['J2', '27.67%'], ['J1', '50%'], ['J3', '72.33%']].map(([id, left]) => (
              <span key={id} style={{ position: 'absolute', left, top: '64%', transform: 'translate(-50%, -50%)', padding: '4px 10px', borderRadius: 999, ...plate(id), fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{WHO[id]}</span>
            ))}

            {lastChip && (
              <div key={chips.length} role="status" style={{ position: 'absolute', right: '3%', top: '6%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(12, 10, 9, 0.82)', backdropFilter: 'blur(8px)', border: `1px solid ${lastChip.ok ? 'rgba(127, 211, 160, 0.4)' : 'rgba(255, 120, 95, 0.45)'}`, color: lastChip.ok ? '#8FDDAE' : '#FF9F8A', fontFamily: MONO, fontSize: 13, animation: 'bc-pop 0.35s ease-out', maxWidth: '45%' }}>
                {lastChip.ok
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastChip.label}</span>
              </div>
            )}

            <div className="bc-float" style={{ position: 'absolute', left: '2.5%', bottom: '5%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 8px 8px', borderRadius: 999, background: 'rgba(12, 10, 9, 0.82)', border: `1px solid ${sp === 'OC' ? '#F08A62' : 'rgba(243, 238, 229, 0.15)'}` }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: '#2A241E', fontFamily: SERIF, fontSize: 15, color: '#F08A62' }}>OC</span>
              <span style={{ fontSize: 13, color: '#CFC7BA' }}>{side === 'Applicant' ? 'Learned PP' : 'Learned Counsel'}</span>
            </div>
            <button type="button" className="bc-float" onClick={() => setDrawer('witness')} style={{ position: 'absolute', right: '2.5%', bottom: '5%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 50, padding: '8px 16px 8px 8px', borderRadius: 999, background: 'rgba(12, 10, 9, 0.82)', border: `1px ${calledW ? 'solid #8FDDAE' : 'dashed rgba(243, 238, 229, 0.35)'}`, color: '#CFC7BA', fontFamily: SANS, fontSize: 13, cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', border: `1px ${calledW ? 'solid #8FDDAE' : 'dashed rgba(243, 238, 229, 0.35)'}`, background: calledW ? '#1E6B43' : 'transparent', fontFamily: SERIF, fontSize: 15, color: '#F3EEE5' }}>W</span>
              {calledW ? `${calledW.id} ${calledW.name} · in the box` : 'Call a witness to the box'}
            </button>

            {started ? (
              <div style={{ position: 'absolute', left: '50%', bottom: '5%', transform: 'translateX(-50%)', width: 'min(620px, 56%)', minWidth: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 22px 16px', borderRadius: 14, background: 'rgba(10, 9, 8, 0.82)', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: sp === 'ADV' ? '#8FDDAE' : '#F08A62' }}>{sp ? CAPTION[sp] : court.connected ? 'The Bench' : 'Court Master'}</span>
                <p aria-live="polite" style={{ margin: 0, minHeight: '2.4em', fontFamily: SERIF, fontSize: 'clamp(18px, 1.9vw, 26px)', lineHeight: 1.2, textWrap: 'balance' }}>
                  {court.caption ? `“${court.caption}”` : court.connected ? '…' : 'All rise. The Bench is assembling.'}
                </p>
              </div>
            ) : (
              <StartPanel side={side} setSide={setSide} ready={!!mootCase} onBegin={begin} onJudgment={onJudgment} upload={upload} caseError={caseError} />
            )}
          </section>

          <section aria-label="Your controls" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px', borderRadius: 22, background: '#1A1714' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 20px' }}>
              <button type="button" aria-label={court.recording ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={court.recording} disabled={!court.connected} onClick={court.toggleMic} style={{ position: 'relative', flex: 'none', width: 84, height: 84, border: 0, padding: 0, borderRadius: '50%', background: 'transparent', cursor: court.connected ? 'pointer' : 'default' }}>
                <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
                  <circle cx="42" cy="42" r="38" fill="none" stroke="rgba(243, 238, 229, 0.12)" strokeWidth="5" />
                  <circle cx="42" cy="42" r="38" fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round" strokeDasharray="238.76" strokeDashoffset={(238.76 * (1 - secs / CUT_IN_SECS)).toFixed(1)} transform="rotate(-90 42 42)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <span style={{ position: 'absolute', inset: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: counselLive ? '#C2421C' : court.recording ? '#5A2A1C' : '#3A332C', color: '#FFFFFF' }}>
                  {court.recording
                    ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" /><path d="M19 11a7 7 0 0 1-14 0" /><path d="M12 18v3" /></svg>
                    : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 2 20 20" /><path d="M18.9 13.6A7 7 0 0 0 19 11" /><path d="M15 9.3V6a3 3 0 0 0-5.7-1.3" /><path d="M9 9v3a3 3 0 0 0 5.1 2.1" /><path d="M5 11a7 7 0 0 0 11.6 5.3" /><path d="M12 18v3" /></svg>}
                </span>
              </button>

              <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: MONO, fontSize: 30, lineHeight: 1, color: ringColor }}>{mmss(secs)}</span>
                  <span style={{ fontSize: 14, color: '#CFC7BA' }}>{micStatus}</span>
                </div>
                <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3, height: 30 }}>
                  {Array.from({ length: 36 }, (_, b) => (
                    <span key={b} style={{ flex: 1, minWidth: 2, maxWidth: 6, height: `${8 + ((b * 7) % 13) * 1.7}px`, borderRadius: 2, background: counselLive || court.leave ? '#8FDDAE' : 'rgba(243, 238, 229, 0.18)', transformOrigin: 'center', animation: `bc-eq ${(0.6 + (b % 5) * 0.12).toFixed(2)}s ease-in-out ${(-(b % 7) * 0.13).toFixed(2)}s infinite`, animationPlayState: counselLive || court.leave ? 'running' : 'paused' }} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <button type="button" aria-pressed={court.leave} disabled={!court.connected} onClick={court.seekLeave} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '0 18px', borderRadius: 999, border: 0, background: court.leave ? '#8FDDAE' : '#F3EEE5', color: '#100E0C', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: court.connected ? 1 : 0.5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
                  {court.leave ? 'Leave granted' : 'Seek Leave / Interrupt'}
                </button>
                <button type="button" aria-label="Hear the Bench again" disabled={!court.caption} onClick={court.replay} style={roundBtn(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                </button>
                <button type="button" aria-label="Type instead" aria-pressed={typing} onClick={() => setTyping(!typing)} style={roundBtn(typing)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01" /><path d="M10 10h.01" /><path d="M14 10h.01" /><path d="M18 10h.01" /><path d="M7 14h10" /></svg>
                </button>
              </div>
            </div>

            {typing && (
              <form onSubmit={submitDraft} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, animation: 'bc-in 0.25s ease-out' }}>
                <label htmlFor="hw-type" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Type your submission</label>
                <input id="hw-type" type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="My Lords, if I may answer the Bench directly…" style={{ flex: '1 1 280px', minWidth: 0, minHeight: 48, padding: '0 18px', borderRadius: 999, border: '1px solid rgba(243, 238, 229, 0.2)', background: '#100E0C', color: '#F3EEE5', fontFamily: SANS, fontSize: 15 }} />
                <button type="button" onClick={() => setDraft(SAMPLES[side])} style={{ minHeight: 48, padding: '0 18px', borderRadius: 999, border: '1px solid rgba(243, 238, 229, 0.22)', background: 'transparent', color: '#F3EEE5', fontFamily: SANS, fontSize: 14, cursor: 'pointer' }}>Use a sample</button>
                <button type="submit" disabled={!court.connected || !draft.trim()} style={{ minHeight: 48, padding: '0 20px', borderRadius: 999, border: 0, background: '#F3EEE5', color: '#100E0C', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: court.connected && draft.trim() ? 1 : 0.5 }}>Submit</button>
              </form>
            )}
            {court.error && <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: '#2B1712', color: '#FF9F8A', fontSize: 14 }}>{court.error}</p>}
          </section>
        </main>

        <aside aria-label="Hearing record" style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!drawer && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 16px', borderRadius: 18, background: '#12261B' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1, color: '#8FDDAE' }}>{verified}</span>
                  <span style={{ fontSize: 13, color: '#B9DCC6' }}>Authorities verified</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 16px', borderRadius: 18, background: '#2B1712' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1, color: '#FF9F8A' }}>{flagged}</span>
                  <span style={{ fontSize: 13, color: '#EBC0B4' }}>Flagged</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 22, background: '#1A1714' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(243, 238, 229, 0.08)' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Transcript</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: '#B5ADA0' }}>{court.entries.length ? `${court.entries.length} turns` : 'waiting'}</span>
                </div>
                <ol style={{ listStyle: 'none', margin: 0, padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 640 }}>
                  {!court.entries.length && <li style={{ fontSize: 14, color: '#8F877B' }}>Everything said in court appears here, with every authority checked as it is cited.</li>}
                  {court.entries.map((e) => (
                    <li key={e.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, animation: 'bc-in 0.3s ease-out' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', color: e.who === 'ADV' ? '#8FDDAE' : e.who === 'OC' ? '#F08A62' : e.who === 'CLERK' ? '#C9A46A' : '#B5ADA0' }}>
                        {WHO[e.who] || e.who}
                        {e.tag && <span style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(240, 138, 98, 0.16)', color: '#F08A62' }}>{e.tag}</span>}
                      </span>
                      <span style={{ fontSize: 14, color: e.who === 'ADV' ? '#CFC7BA' : e.who === 'CLERK' ? '#E8D8B8' : '#F3EEE5' }}>{e.text}</span>
                      {[...(e.chips || []), ...(e.chip ? [e.chip] : [])].map((c, i) => (
                        <span key={i} style={{ padding: '3px 10px', borderRadius: 999, background: c.ok === null ? 'rgba(201, 164, 106, 0.16)' : c.ok ? 'rgba(127, 211, 160, 0.14)' : 'rgba(255, 120, 95, 0.14)', color: c.ok === null ? '#E8C98F' : c.ok ? '#8FDDAE' : '#FF9F8A', fontSize: 12, fontWeight: 500 }}>{c.label}</span>
                      ))}
                    </li>
                  ))}
                  <li ref={transcriptEnd} aria-hidden="true" />
                </ol>
              </div>
            </div>
          )}

          {drawer === 'record' && (
            <section aria-label="Moot problem" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 22, background: '#F4F0E8', color: '#14120F', animation: 'bc-in 0.25s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '18px 18px 12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.05 }}>Moot problem</span>
                  <span style={{ fontSize: 13, color: '#5E574C' }}>{mootCase?.title || '…'} · fictional record</span>
                </div>
                <button type="button" aria-label="Close moot problem" onClick={() => setDrawer(null)} style={closeBtn(true)}><X /></button>
              </div>
              <div role="tablist" aria-label="Record sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 18px 12px' }}>
                {Object.keys(record).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={t === recTab} onClick={() => setRecTab(t)} style={{ minHeight: 36, padding: '0 14px', borderRadius: 999, border: 0, background: t === recTab ? '#14120F' : '#E6DFD2', color: t === recTab ? '#F4F0E8' : '#14120F', fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
              <ol style={{ listStyle: 'none', margin: 0, padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 640 }}>
                {record[recTab].map((r, i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: 8, fontSize: 14, lineHeight: 1.55 }}>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: '#A83716', paddingTop: 2 }}>{r.n}</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {drawer === 'witness' && (
            <section aria-label="Witness box" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, padding: 18, borderRadius: 22, background: '#1A1714', animation: 'bc-in 0.25s ease-out', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.05 }}>Witness box</span>
                <button type="button" aria-label="Close witness box" onClick={() => setDrawer(null)} style={closeBtn(false)}><X /></button>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allW.map((w) => {
                  const inBox = w.id === called;
                  return (
                    <li key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 16, background: inBox ? '#14261B' : '#221E1A', border: `1px solid ${inBox ? 'rgba(143, 221, 174, 0.5)' : 'transparent'}` }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', color: '#B5ADA0' }}><span>{w.id} · {w.side}</span><span style={{ color: '#8FDDAE' }}>{inBox ? 'IN THE BOX' : ''}</span></span>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{w.name}</span>
                      <span style={{ fontSize: 13, color: '#CFC7BA' }}>{w.role}</span>
                      <button type="button" disabled={!court.connected} onClick={() => callOrRelease(w)} style={{ alignSelf: 'flex-start', minHeight: 40, padding: '0 16px', borderRadius: 999, border: inBox ? '1px solid rgba(243, 238, 229, 0.3)' : 0, background: inBox ? 'transparent' : '#F3EEE5', color: inBox ? '#F3EEE5' : '#100E0C', fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: court.connected ? 1 : 0.5 }}>{inBox ? 'Release from the box' : 'Call to the box'}</button>
                    </li>
                  );
                })}
              </ul>
              <form aria-label="Add a witness" onSubmit={addWitness} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 16, border: '1px dashed rgba(243, 238, 229, 0.25)' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Add a witness</span>
                <label style={label}>Name<input type="text" value={wForm.name} onChange={(e) => setWForm({ ...wForm, name: e.target.value })} placeholder="e.g. Dr. Meera Kulkarni" style={input} /></label>
                <label style={label}>Role<input type="text" value={wForm.role} onChange={(e) => setWForm({ ...wForm, role: e.target.value })} placeholder="e.g. Treating doctor, Pune" style={input} /></label>
                <label style={label}>What they will say<textarea rows={2} value={wForm.says} onChange={(e) => setWForm({ ...wForm, says: e.target.value })} placeholder="The Applicant was at the hospital with her mother from 19 to 27 March 2025." style={{ ...input, padding: '10px 12px', resize: 'vertical' }} /></label>
                <button type="submit" disabled={!court.connected} style={{ minHeight: 44, borderRadius: 999, border: 0, background: '#F3EEE5', color: '#100E0C', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: court.connected ? 1 : 0.5 }}>Add &amp; call to the box</button>
              </form>
            </section>
          )}

          {drawer === 'annex' && (
            <section aria-label="Annexures" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, padding: 18, borderRadius: 22, background: '#1A1714', animation: 'bc-in 0.25s ease-out', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.05 }}>Documents &amp; annexures</span>
                <button type="button" aria-label="Close annexures" onClick={() => setDrawer(null)} style={closeBtn(false)}><X /></button>
              </div>
              <form aria-label="Tender a document" onSubmit={tenderDoc} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '22px 16px', borderRadius: 16, border: '1.5px dashed rgba(243, 238, 229, 0.3)', textAlign: 'center', cursor: 'pointer' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F3EEE5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="m9 15 3-3 3 3" /></svg>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{aForm.file || 'Drop a document to tender'}</span>
                  <span style={{ fontSize: 12, color: '#B5ADA0' }}>PDF, Word, image or text</span>
                  <input type="file" accept=".pdf,.docx,.txt,image/*" onChange={(e) => setAForm({ ...aForm, file: e.target.files?.[0]?.name || '' })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
                <label style={label}>Describe it for the Bench<input type="text" value={aForm.title} onChange={(e) => setAForm({ ...aForm, title: e.target.value })} placeholder="e.g. Hospital admission record, Pune, 19 March 2025" style={input} /></label>
                <button type="submit" disabled={!court.connected} style={{ minHeight: 44, borderRadius: 999, border: 0, background: '#C2421C', color: '#FFFFFF', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: court.connected ? 1 : 0.5 }}>Tender to the Bench</button>
              </form>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {annexes.map((a) => (
                  <li key={a.id} style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: a.tendered ? '#2A2216' : '#221E1A', animation: 'bc-in 0.3s ease-out' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, background: '#F4F0E8', color: '#14120F', fontFamily: MONO, fontSize: 12, fontWeight: 500 }}>{a.id}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{a.title}</span>
                      <span style={{ fontSize: 12, color: a.tendered ? '#E8C98F' : '#B5ADA0' }}>{a.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p style={{ margin: 0, padding: '0 6px', fontSize: 12, color: '#8F877B' }}>Practice moot court, not legal advice.</p>
        </aside>
      </div>
    </div>
  );
}

function StartPanel({ side, setSide, ready, onBegin, onJudgment, upload, caseError }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(10, 9, 8, 0.55)' }}>
      <div style={{ width: 'min(520px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 22px', borderRadius: 18, background: 'rgba(10, 9, 8, 0.88)', backdropFilter: 'blur(10px)', textAlign: 'center', animation: 'bc-pop 0.35s ease-out' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F08A62' }}>Court Master</span>
        <p style={{ margin: 0, fontFamily: SERIF, fontSize: 'clamp(24px, 2.6vw, 34px)', lineHeight: 1.1 }}>Who do you appear for?</p>
        <div role="radiogroup" aria-label="Your side" style={{ display: 'flex', gap: 4, padding: 5, borderRadius: 999, background: '#100E0C', border: '1px solid rgba(243, 238, 229, 0.12)' }}>
          {['Applicant', 'State'].map((s) => (
            <button key={s} type="button" role="radio" aria-checked={side === s} onClick={() => setSide(s)} style={{ minHeight: 40, padding: '0 18px', borderRadius: 999, border: 0, background: side === s ? '#F3EEE5' : 'transparent', color: side === s ? '#100E0C' : '#B5ADA0', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
        <button type="button" disabled={!ready || upload.busy} onClick={onBegin} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '0 26px', borderRadius: 999, border: 0, background: '#C2421C', color: '#FFFFFF', fontFamily: SANS, fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: ready && !upload.busy ? 1 : 0.6 }}>
          Begin the hearing
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
        <label style={{ fontSize: 13, color: '#CFC7BA', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 5, textDecorationColor: 'rgba(243, 238, 229, 0.35)' }}>
          Or drop your own judgment (PDF · DOCX · TXT)
          <input type="file" accept=".pdf,.docx,.txt" disabled={upload.busy} onChange={(e) => onJudgment(e.target.files?.[0])} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        </label>
        {(upload.msg || caseError) && <span role="status" style={{ fontSize: 13, color: caseError ? '#FF9F8A' : '#E8C98F' }}>{caseError || upload.msg}</span>}
        <span style={{ fontSize: 12, color: '#8F877B' }}>Your mic turns on when the hearing begins. You can type instead at any time.</span>
      </div>
    </div>
  );
}

function ScorecardView({ court, mootCase, onAgain }) {
  const sc = court.scorecard;
  const rows = sc ? CRITERIA.map(([k, name]) => ({ k, name, ...(sc.scores?.[k] || { score: 0 }) })) : [];
  const weakest = rows.reduce((a, b) => (b.score < (a?.score ?? 11) ? b : a), null);
  return (
    <div style={{ minHeight: '100vh', fontFamily: SANS, WebkitFontSmoothing: 'antialiased' }}>
      <header style={{ maxWidth: 1240, margin: '0 auto', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#F3EEE5', textDecoration: 'none', minHeight: 44 }}><Logo /><span style={{ fontFamily: SERIF, fontSize: 24 }}>Banthry Courtroom</span></a>
        <button type="button" onClick={onAgain} style={{ minHeight: 44, padding: '0 20px', borderRadius: 999, border: 0, background: '#C2421C', color: '#FFFFFF', fontFamily: SANS, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Argue again</button>
      </header>
      {!sc ? (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
          {court.evaluating
            ? <><span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F08A62' }}>Judgment reserved</span><p style={{ margin: 0, fontFamily: SERIF, fontSize: 44 }}>The Bench is conferring…</p></>
            : <p role="alert" style={{ margin: 0, color: '#FF9F8A' }}>{court.error}</p>}
        </div>
      ) : (
        <section aria-label="Scorecard" style={{ maxWidth: 1240, margin: '0 auto', padding: '56px 24px 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: '48px 80px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#B5ADA0' }}>{mootCase?.title}</span>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(40px, 5vw, 68px)', lineHeight: 1 }}>Scored like a judgment.</h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 24 }}>
              <span style={{ fontFamily: SERIF, fontSize: 'clamp(140px, 17vw, 240px)', lineHeight: 0.8, letterSpacing: '-0.03em' }}>{Number(sc.overall).toFixed(1)}</span>
              <span style={{ fontFamily: MONO, fontSize: 16, color: '#B5ADA0' }}>/ 10</span>
            </div>
            <ul style={{ listStyle: 'none', margin: '32px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(sc.judge_comments || {}).map(([j, c]) => (
                <li key={j} style={{ padding: '14px 18px', borderRadius: 16, background: '#1A1714', fontSize: 14, color: '#CFC7BA' }}><span style={{ fontFamily: MONO, fontSize: 11, color: '#F08A62', marginRight: 8 }}>{WHO[j] || j}</span>{c}</li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <ul aria-label="Scores" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rows.map((r) => {
                const low = r === weakest;
                return (
                  <li key={r.k} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 32px', alignItems: 'center', gap: 16, fontSize: 15 }}>
                    <span style={{ color: low ? '#F3EEE5' : '#CFC7BA', fontWeight: low ? 600 : 400 }}>{r.name}</span>
                    <span aria-hidden="true" style={{ display: 'block', height: 8, borderRadius: 4, background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: `${r.score * 10}%`, height: 8, borderRadius: 4, background: low ? '#E0582F' : '#F3EEE5' }} /></span>
                    <span style={{ fontFamily: MONO, textAlign: 'right', color: low ? '#F08A62' : '#F3EEE5' }}>{Number(r.score).toFixed(0)}</span>
                  </li>
                );
              })}
            </ul>
            {weakest?.evidence_quote && (
              <blockquote style={{ margin: 0, padding: '18px 22px', borderRadius: 16, background: '#1A1714', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.25 }}>“{weakest.evidence_quote}”</span>
                <span style={{ fontSize: 13, color: '#B5ADA0' }}>Quoted from your transcript · {weakest.feedback}</span>
              </blockquote>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Before your next hearing</span>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, color: '#CFC7BA', fontSize: 15 }}>
                {(sc.improvements || []).map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
            {!!sc.flagged_citations?.length && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sc.flagged_citations.map((c, i) => <span key={i} style={{ padding: '6px 12px', borderRadius: 999, background: '#2B1712', color: '#FF9F8A', fontSize: 13 }}>{c.name} — {c.status === 'not_found' ? 'not found' : c.status}</span>)}
              </div>
            )}
            <p style={{ margin: 0, fontSize: 12, color: '#8F877B' }}>{sc.disclaimer || 'Practice moot court, not legal advice.'}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function CourtroomArt() {
  return (
    <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="hwWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2E231B" /><stop offset="1" stopColor="#17110D" /></linearGradient>
        <linearGradient id="hwDesk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#553B28" /><stop offset="1" stopColor="#2A1D14" /></linearGradient>
        <linearGradient id="hwChair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#74271C" /><stop offset="1" stopColor="#3A120D" /></linearGradient>
        <radialGradient id="hwLight" cx="0.5" cy="0" r="0.75"><stop offset="0" stopColor="#FFD9AE" stopOpacity="0.3" /><stop offset="0.55" stopColor="#FFD9AE" stopOpacity="0.05" /><stop offset="1" stopColor="#FFD9AE" stopOpacity="0" /></radialGradient>
        <radialGradient id="hwVignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stopColor="#000000" stopOpacity="0" /><stop offset="1" stopColor="#000000" stopOpacity="0.55" /></radialGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="560" fill="url(#hwWall)" />
      <rect x="0" y="34" width="1200" height="12" fill="#3B2C21" />
      <g fill="#FFFFFF" fillOpacity="0.025" stroke="#000000" strokeOpacity="0.25">
        {[10, 110, 210, 310, 410, 702, 802, 902, 1002, 1102].map((x) => <rect key={x} x={x} y="62" width="88" height="250" rx="2" />)}
      </g>
      <path d="M512 320 V150 A88 88 0 0 1 688 150 V320 Z" fill="#120D0A" stroke="#6A4F39" strokeWidth="2" />
      <path d="M286 330 V176 Q286 132 332 132 Q378 132 378 176 V330 Z" fill="url(#hwChair)" />
      <path d="M546 330 V142 Q546 92 600 92 Q654 92 654 142 V330 Z" fill="url(#hwChair)" />
      <path d="M822 330 V176 Q822 132 868 132 Q914 132 914 176 V330 Z" fill="url(#hwChair)" />
      <g fill="#0D0B0A">
        <circle cx="332" cy="210" r="24" /><path d="M288 330 Q290 252 332 246 Q374 252 376 330 Z" />
        <circle cx="600" cy="186" r="27" /><path d="M550 330 Q552 230 600 223 Q648 230 650 330 Z" />
        <circle cx="868" cy="210" r="24" /><path d="M824 330 Q826 252 868 246 Q910 252 912 330 Z" />
      </g>
      <g fill="#F3EEE5">
        <rect x="326" y="247" width="5" height="20" rx="1.5" /><rect x="333" y="247" width="5" height="20" rx="1.5" />
        <rect x="593" y="224" width="6" height="23" rx="1.5" /><rect x="601" y="224" width="6" height="23" rx="1.5" />
        <rect x="862" y="247" width="5" height="20" rx="1.5" /><rect x="869" y="247" width="5" height="20" rx="1.5" />
      </g>
      <path d="M104 316 H1096 L1086 334 H114 Z" fill="#7A5A3E" />
      <path d="M114 334 H1086 L1118 492 H82 Z" fill="url(#hwDesk)" />
      <g stroke="#000000" strokeOpacity="0.22" strokeWidth="2">
        {[[150, 144], [200, 196], [250, 247], [400, 399], [450, 450], [750, 750], [800, 801], [950, 953], [1000, 1004], [1050, 1056]].map(([a, b]) => <path key={a} d={`M${a} 350 L${b} 476`} />)}
      </g>
      <path d="M420 314 L478 306 L482 316 L424 322 Z" fill="#EDE6D8" fillOpacity="0.85" />
      <rect x="0" y="492" width="1200" height="68" fill="#0F0C0A" />
      <rect x="0" y="0" width="1200" height="560" fill="url(#hwLight)" />
      <rect x="0" y="0" width="1200" height="560" fill="url(#hwVignette)" />
    </svg>
  );
}
