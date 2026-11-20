import React, { useState, useEffect, useRef } from 'react';
import { speakJudgeAudio, cancelJudgeAudio } from '../voice/moot/indianVoiceService.js';

var SCRIPT = [
  { sp: 'J1', text: 'Counsel for the Applicant, you may begin.', dur: 4 },
  { sp: 'ADV', text: 'May it please Your Lordships. The Applicant joined the investigation on every date fixed. As the Supreme Court held in Arnesh Kumar…', dur: 8, clock: [0, 38], chip: 'Arnesh Kumar · verified', ok: true },
  { sp: 'J1', text: 'Counsel, let us stop you there. Answer the Bench directly — was the notice served? Yes or no?', dur: 5, tag: 'cut in at 0:38' },
  { sp: 'ADV', text: 'No, My Lord. It was never served on the Applicant.', dur: 4, clock: [0, 6] },
  { sp: 'OC', text: 'Objection, My Lords. The State relies on Kapoor v. State — custody is the rule in subsidy frauds.', dur: 5, chip: 'Kapoor v. State · not found', ok: false, tag: 'objection' },
  { sp: 'J3', text: 'Learned Prosecutor, where is this authority reported? Cite the paragraph.', dur: 4 },
  { sp: 'J2', text: 'Counsel, the seizure memo at Ex. P-3 bears no date. When, exactly, were the statements seized?', dur: 6 }
];

var WHO = { J1: "J1 · PRESIDING", J2: "J2 · SENIOR PUISNE", J3: "J3 · JUNIOR PUISNE", OC: "LEARNED PP", ADV: "YOU", W: "WITNESS", CLERK: "COURT MASTER" };
var CAPTION = { J1: "Hon'ble Presiding Judge", J2: "Hon'ble Senior Puisne Judge", J3: "Hon'ble Junior Puisne Judge", OC: "Learned Public Prosecutor", ADV: "You · live", W: "Witness" };
var TICK = 250;

var DEFAULT_RECORD = {
  Facts: [
    'Suryodaya Agro Producers Pvt. Ltd. is a farmer-producer company in Kalyanpur. The Applicant has been its whole-time director since 2019.',
    'In June 2024 the State sanctioned an input subsidy of ₹4.2 crore for seed and drip-irrigation kits for 1,200 farmer-members.',
    'The subsidy was credited in two tranches, in July and September 2024, to the company’s account at Kalyanpur Co-operative Bank.',
    'A January 2025 audit found ₹1.6 crore paid to Harit Supply Solutions LLP — linked to the Applicant’s brother-in-law — for kits 340 farmers say never arrived.',
    'On 14 March 2025 FIR No. 117/2025 was registered under ss. 316(5), 318(4) and 61(2) BNS.',
    'On 18 March 2025 the IO seized bank statements, the invoice ledger and a server image. The seizure memo (Ex. P-3) bears no date.',
    'The State relies on a s. 35(3) BNSS notice dated 20 March 2025, “affixed at residence”. The Applicant says it was never served.',
    'On 2 April 2025 the Applicant offered, through counsel, to join investigation. On 5 April the IO moved to arrest her.',
    'On 22 April 2025 the Sessions Court refused her anticipatory bail but granted it to co-director Arvind Kulkarni.',
    'The State says invoice entries were edited from her login on 10 March 2025. She has deposited ₹50 lakh without prejudice.'
  ],
  Issues: [
    'Whether pre-arrest bail under s. 482 BNSS ought to be entertained where service of the s. 35(3) notice is disputed.',
    'Whether custodial interrogation is necessary once the records are seized.',
    'Whether the material discloses a prima facie offence under ss. 316(5) and 318(4) BNS.',
    'Whether parity and the ₹50 lakh deposit entitle the Applicant to relief, and on what conditions.'
  ],
  Exhibits: [
    'P-1 · FIR No. 117/2025, Kalyanpur Police Station (14 March 2025).',
    'P-2 · Notice under s. 35(3) BNSS (20 March 2025) — “noticee not found, affixed on the door”.',
    'P-3 · Seizure memo — date of seizure left blank.',
    'P-4 · Departmental audit extract (January 2025).'
  ],
  Provisions: [
    's. 482 BNSS — anticipatory bail (formerly s. 438 CrPC).',
    's. 35(3)–(6) BNSS — notice of appearance (formerly s. 41A CrPC).',
    's. 316(5) BNS — criminal breach of trust by an agent (formerly s. 409 IPC).',
    's. 318(4) BNS — cheating and inducing delivery of property (formerly s. 420 IPC).',
    'Art. 21, Constitution of India — personal liberty.'
  ]
};

var BASE_WITNESSES = [
  { id: 'W-1', name: 'Inspector Vikrant Rane', role: 'Investigating Officer, Kalyanpur PS', side: 'STATE WITNESS' },
  { id: 'W-2', name: 'Sameer Joshi', role: 'Branch Manager, Kalyanpur Co-op Bank', side: 'YOUR WITNESS' }
];

export function HearingWorkspace({
  mootCase,
  side = 'Petitioner',
  hearing,
  onFinishHearing,
  onBackToLanding,
}) {
  const [i, setI] = useState(0);
  const [q, setQ] = useState(0);
  const [total, setTotal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [leave, setLeave] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typedSubmission, setTypedSubmission] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [recTab, setRecTab] = useState('Facts');
  const [called, setCalled] = useState(null);
  const [customWitnesses, setCustomWitnesses] = useState([]);
  const [tenderedAnnexures, setTenderedAnnexures] = useState([]);
  const [wName, setWName] = useState('');
  const [wRole, setWRole] = useState('');
  const [wSays, setWSays] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aFile, setAFile] = useState('');

  const timerRef = useRef(null);

  // Playback timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (paused || leave) return;
      setQ((prevQ) => {
        const curDur = SCRIPT[i]?.dur || 5;
        if (prevQ >= curDur * (1000 / TICK)) {
          setI((prevI) => (prevI + 1) % SCRIPT.length);
          return 0;
        }
        return prevQ + 1;
      });
      setTotal((prevTotal) => prevTotal + 1);
    }, TICK);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [i, paused, leave]);

  // Voice synthesis on turn switch (with Indian English voice)
  useEffect(() => {
    const cur = SCRIPT[i];
    if (cur && cur.sp && cur.sp !== 'ADV' && !paused && !leave) {
      speakJudgeAudio(cur.text, cur.sp);
    }
  }, [i, paused, leave]);

  const cur = SCRIPT[i] || SCRIPT[0];
  const sp = (hearing?.caption ? hearing.who : cur.sp) || 'J1';
  const text = hearing?.caption || cur.text;

  const counselSpeaking = sp === 'ADV' || hearing?.recording;
  const chipVisible = cur.chip && (sp === 'ADV' || sp === 'OC' || sp === 'J1');

  const secs = cur.clock ? cur.clock[1] : 38;
  const mm = cur.clock ? cur.clock[0] : 0;
  const ss = cur.clock ? cur.clock[1] : 38;
  const hot = secs >= 35;
  const ringColor = hot ? '#F08A62' : '#8FDDAE';
  const ringOffset = (238.76 * (1 - Math.min(secs, 40) / 40)).toFixed(1);

  // Bench indicators
  const ring = (id) => (sp === id ? 'url(#hwLight)' : 'transparent');
  const glow = (id) => (sp === id ? 'bc-glow 2s ease-in-out infinite' : 'none');
  const plateBg = (id) => (sp === id ? '#F08A62' : 'rgba(243, 238, 229, 0.12)');
  const plateFg = (id) => (sp === id ? '#100E0C' : '#F3EEE5');

  const j1Ring = ring('J2');
  const j1Glow = glow('J2');
  const j1PlateBg = plateBg('J2');
  const j1PlateFg = plateFg('J2');

  const j2Ring = ring('J1');
  const j2Glow = glow('J1');
  const j2PlateBg = plateBg('J1');
  const j2PlateFg = plateFg('J1');

  const j3Ring = ring('J3');
  const j3Glow = glow('J3');
  const j3PlateBg = plateBg('J3');
  const j3PlateFg = plateFg('J3');

  const ocBorder = sp === 'OC' ? '#F08A62' : 'rgba(243, 238, 229, 0.15)';
  const captionWho = CAPTION[sp] || "Hon'ble Presiding Judge";
  const captionColor = sp === 'ADV' ? '#8FDDAE' : '#F08A62';
  const captionText = '“' + text + '”';

  const showChip = Boolean(chipVisible || (hearing?.latestCitations && hearing.latestCitations.length > 0));
  const chipOk = cur.ok !== false;
  const chipBad = !chipOk;
  const chipLabel = hearing?.latestCitations?.[0]?.citation
    ? `${hearing.latestCitations[0].citation} · ${hearing.latestCitations[0].verified ? 'verified' : 'flagged'}`
    : (cur.chip || '');

  const chipColor = chipOk ? '#8FDDAE' : '#FF9F8A';
  const chipBorder = chipOk ? 'rgba(127, 211, 160, 0.4)' : 'rgba(255, 120, 95, 0.45)';

  const clock = mm + ':' + ('0' + ss).slice(-2);
  const elapsed = ('0' + Math.floor((total * TICK) / 60000)).slice(-2) + ':' + ('0' + Math.floor(((total * TICK) % 60000) / 1000)).slice(-2);

  const micStatus = counselSpeaking
    ? (hot ? 'Past 0:35 — the Bench may cut in' : 'You’re speaking · Bench may cut in at 0:35')
    : (leave ? 'Leave granted — go ahead, briefly' : 'Bench speaking · your mic is held');

  const wave = Array.from({ length: 36 }).map((_, idx) => {
    const h = Math.round(6 + (Math.sin(idx * 0.45) * 0.5 + 0.5) * 26);
    return {
      h: `${h}px`,
      delay: `${-(idx * 0.08)}s`,
      d: `${0.6 + (idx % 5) * 0.12}s`
    };
  });

  const waveColor = counselSpeaking || leave ? '#8FDDAE' : 'rgba(243, 238, 229, 0.18)';
  const waveState = counselSpeaking || leave ? 'running' : 'paused';
  const micBg = counselSpeaking ? '#C2421C' : '#3A332C';

  const leaveLabel = leave ? 'Leave granted' : "Seek Leave / Interrupt";
  const leaveBg = leave ? '#8FDDAE' : '#F3EEE5';
  const leaveFg = '#100E0C';

  const toggleLeave = () => {
    const next = !leave;
    setLeave(next);
    if (hearing?.interrupt) {
      hearing.interrupt("With respect, my Lords, may Counsel seek leave to clarify?");
    }
  };

  const toggleType = () => setTyping(!typing);
  const typeBg = typing ? '#F3EEE5' : '#2A2520';
  const typeFg = typing ? '#100E0C' : '#F3EEE5';
  const togglePlay = () => setPaused(!paused);
  const playLabel = paused ? 'Resume' : 'Pause';
  const playing = !paused;

  // Drawer handlers
  const openRecord = () => setDrawer(drawer === 'record' ? null : 'record');
  const openWitness = () => setDrawer(drawer === 'witness' ? null : 'witness');
  const openAnnex = () => setDrawer(drawer === 'annex' ? null : 'annex');
  const closeDrawer = () => setDrawer(null);

  const dRecord = drawer === 'record';
  const dRecordBg = dRecord ? '#F3EEE5' : '#231E19';
  const dRecordFg = dRecord ? '#100E0C' : '#F3EEE5';

  const dWitness = drawer === 'witness';
  const dWitnessBg = dWitness ? '#F3EEE5' : '#231E19';
  const dWitnessFg = dWitness ? '#100E0C' : '#F3EEE5';

  const dAnnex = drawer === 'annex';
  const dAnnexBg = dAnnex ? '#F3EEE5' : '#231E19';
  const dAnnexFg = dAnnex ? '#100E0C' : '#F3EEE5';

  const noDrawer = !drawer;

  // Record Tabs
  const recordSource = mootCase?.facts ? {
    Facts: mootCase.facts,
    Issues: mootCase.issues || DEFAULT_RECORD.Issues,
    Exhibits: mootCase.exhibits || DEFAULT_RECORD.Exhibits,
    Provisions: DEFAULT_RECORD.Provisions
  } : DEFAULT_RECORD;

  const recTabs = ['Facts', 'Issues', 'Exhibits', 'Provisions'].map((label) => ({
    label,
    on: recTab === label,
    bg: recTab === label ? '#F3EEE5' : '#231E19',
    fg: recTab === label ? '#100E0C' : '#CFC7BA',
    pick: () => setRecTab(label)
  }));

  const recItems = (recordSource[recTab] || []).map((t, idx) => ({
    n: ('0' + (idx + 1)).slice(-2),
    text: t
  }));

  // Witnesses
  const allWitnesses = BASE_WITNESSES.concat(customWitnesses);
  const calledW = allWitnesses.find((w) => w.id === called);
  const wLabel = calledW ? `${calledW.id} ${calledW.name} · in the box` : 'Call a witness to the box';
  const wBorder = calledW ? '#8FDDAE' : 'rgba(243, 238, 229, 0.35)';
  const wStyle = calledW ? 'solid' : 'dashed';
  const wDot = calledW ? '#1E6B43' : 'transparent';

  const witnesses = allWitnesses.map((w) => ({
    ...w,
    status: called === w.id ? 'In the box' : 'Available',
    btn: called === w.id ? 'Standing down' : 'Call to box',
    bg: called === w.id ? '#2A231C' : '#1A1714',
    border: called === w.id ? '#8FDDAE' : 'rgba(243, 238, 229, 0.1)',
    btnBg: called === w.id ? '#8FDDAE' : '#F3EEE5',
    btnFg: '#100E0C',
    act: () => setCalled(called === w.id ? null : w.id)
  }));

  const addWitness = () => {
    if (!wName.trim()) return;
    const newId = `W-${allWitnesses.length + 1}`;
    const newW = {
      id: newId,
      name: wName.trim(),
      role: (wRole || 'Witness for the Applicant').trim(),
      side: 'YOUR WITNESS'
    };
    setCustomWitnesses([...customWitnesses, newW]);
    setCalled(newId);
    setWName('');
    setWRole('');
    setWSays('');
  };

  // Annexures
  const initialAnnexes = [
    { id: 'P-1', title: 'FIR No. 117/2025 Kalyanpur PS', status: 'Marked on record', bg: '#1A1714', statusColor: '#8FDDAE' },
    { id: 'P-2', title: 'Notice under s. 35(3) BNSS', status: 'Service disputed', bg: '#1A1714', statusColor: '#FF9F8A' },
    { id: 'P-3', title: 'Seizure memo (undated)', status: 'Marked subject to objection', bg: '#1A1714', statusColor: '#F08A62' },
    { id: 'P-4', title: 'Bank statement of Kalyanpur Co-op', status: 'Admitted on record', bg: '#1A1714', statusColor: '#8FDDAE' }
  ];

  const annexes = initialAnnexes.concat(tenderedAnnexures);
  const annexCount = annexes.length;
  const aFileLabel = aFile ? aFile : 'Drop a document to tender';

  const tender = () => {
    if (!aTitle.trim() && !aFile) return;
    const newId = `A-${tenderedAnnexures.length + 1}`;
    const title = (aTitle || aFile || 'Tendered Document').trim();
    setTenderedAnnexures([
      ...tenderedAnnexures,
      { id: newId, title, status: 'Marked subject to objection', bg: '#2A231C', statusColor: '#F08A62' }
    ]);
    setATitle('');
    setAFile('');
  };

  const handleRestCase = () => {
    cancelJudgeAudio();
    if (hearing?.endHearing) hearing.endHearing();
    if (onFinishHearing) onFinishHearing();
  };

  const handleSubmitText = () => {
    if (!typedSubmission.trim()) return;
    if (hearing?.typeAnswer) hearing.typeAnswer(typedSubmission);
    if (hearing?.submitAnswer) hearing.submitAnswer(typedSubmission);
    setTypedSubmission('');
    setTyping(false);
  };

  // Transcript entries
  const defaultEntries = [
    { who: 'J1 · PRESIDING', text: 'Counsel for the Applicant, you may begin.', tag: null, chip: null, color: '#F08A62' },
    { who: 'YOU', text: 'May it please Your Lordships. The Applicant joined the investigation on every date fixed. As the Supreme Court held in Arnesh Kumar…', tag: null, chip: 'Arnesh Kumar · verified', color: '#8FDDAE', chipBg: '#1A2E22', chipFg: '#8FDDAE' },
    { who: 'J1 · PRESIDING', text: 'Counsel, let us stop you there. Answer the Bench directly — was the notice served? Yes or no?', tag: 'cut in at 0:38', chip: null, color: '#F08A62' },
    { who: 'LEARNED PP', text: 'Objection, My Lords. The State relies on Kapoor v. State — custody is the rule in subsidy frauds.', tag: 'objection', chip: 'Kapoor v. State · not found', color: '#F08A62', chipBg: '#3A1E17', chipFg: '#FF9F8A' }
  ];

  const entries = (hearing?.qaLog && hearing.qaLog.length > 0)
    ? hearing.qaLog.map((log) => ({
        who: log.q_who ? (WHO[log.q_who] || log.q_who) : 'BENCH',
        text: log.q_text || log.text || '',
        tag: log.tag || null,
        chip: log.citation || null,
        color: '#F08A62',
        chipBg: '#1A2E22',
        chipFg: '#8FDDAE',
      }))
    : defaultEntries;

  const verified = 2;
  const flagged = 1;

  return (
<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '15px', lineHeight: '1.5', WebkitFontSmoothing: 'antialiased' }}>

<header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px 20px', padding: '12px 20px' }}>
<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', minWidth: '0' }}>
<a href="#top" onClick={(e) => { e.preventDefault(); if (onBackToLanding) onBackToLanding(); }} aria-label="Banthry Courtroom home" style={{ display: 'flex', alignItems: 'center', minHeight: '44px' }}>
<svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true"><rect x="2" y="4" width="26" height="3" rx="1" fill="#F3EEE5" /><rect x="5" y="10" width="4" height="13" rx="1" fill="#F3EEE5" /><rect x="13" y="10" width="4" height="13" rx="1" fill="#E0582F" /><rect x="21" y="10" width="4" height="13" rx="1" fill="#F3EEE5" /><rect x="2" y="25" width="26" height="2" rx="1" fill="#F3EEE5" /></svg>
</a>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '24px', lineHeight: '1.1' }}>Devika Rao <em style={{ fontStyle: 'italic', color: '#F08A62' }}>v.</em> The State</span>
<span style={{ display: 'inline-flex', alignItems: 'center', minHeight: '30px', padding: '0 12px', borderRadius: '999px', background: '#1F1B17', fontSize: '13px', color: '#CFC7BA' }}>Anticipatory bail · you appear for the Applicant</span>
</div>
<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '36px', padding: '0 14px', borderRadius: '999px', background: 'rgba(229, 83, 58, 0.16)', color: '#FF9F8A', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '13px' }}><span aria-hidden="true" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#E5533A', animation: 'bc-pulse 1.6s ease-in-out infinite' }}></span>Live · {elapsed}</span>
<div role="group" aria-label="Court tools" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', borderRadius: '999px', background: '#1F1B17' }}>
<button type="button" aria-pressed={dRecord} onClick={openRecord} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px', padding: '0 14px', borderRadius: '999px', border: '0', background: dRecordBg, color: dRecordFg, fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" /><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg>Moot problem</button>
<button type="button" aria-pressed={dWitness} onClick={openWitness} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px', padding: '0 14px', borderRadius: '999px', border: '0', background: dWitnessBg, color: dWitnessFg, fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>Witness box</button>
<button type="button" aria-pressed={dAnnex} onClick={openAnnex} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '40px', padding: '0 14px', borderRadius: '999px', border: '0', background: dAnnexBg, color: dAnnexFg, fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>Annexures<span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '999px', background: '#C2421C', color: '#FFFFFF', fontSize: '11px', fontWeight: '600' }}>{annexCount}</span></button>
</div>
<button type="button" onClick={togglePlay} aria-pressed={playing} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '0 16px', borderRadius: '999px', border: '1px solid rgba(243, 238, 229, 0.22)', background: 'transparent', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>{playLabel}</button>
<button type="button" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 18px', borderRadius: '999px', border: '0', background: '#C2421C', color: '#FFFFFF', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }} onClick={handleRestCase}>Rest case</button>
</div>
</header>

<div style={{ flex: '1', display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '0 20px 20px', minHeight: '0' }}>

<main style={{ flex: '999 1 640px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>

<section aria-label="The courtroom" style={{ position: 'relative', borderRadius: '22px', overflow: 'hidden', aspectRatio: '1200 / 560', background: '#1A1410', boxShadow: '0 0 0 1px rgba(243, 238, 229, 0.08)' }}>
<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' }}>
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
<rect x="10" y="62" width="88" height="250" rx="2" /><rect x="110" y="62" width="88" height="250" rx="2" /><rect x="210" y="62" width="88" height="250" rx="2" /><rect x="310" y="62" width="88" height="250" rx="2" /><rect x="410" y="62" width="88" height="250" rx="2" />
<rect x="702" y="62" width="88" height="250" rx="2" /><rect x="802" y="62" width="88" height="250" rx="2" /><rect x="902" y="62" width="88" height="250" rx="2" /><rect x="1002" y="62" width="88" height="250" rx="2" /><rect x="1102" y="62" width="88" height="250" rx="2" />
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
<path d="M150 350 L144 476" /><path d="M200 350 L196 476" /><path d="M250 350 L247 476" /><path d="M400 350 L399 476" /><path d="M450 350 L450 476" /><path d="M750 350 L750 476" /><path d="M800 350 L801 476" /><path d="M950 350 L953 476" /><path d="M1000 350 L1004 476" /><path d="M1050 350 L1056 476" />
</g>
<path d="M420 314 L478 306 L482 316 L424 322 Z" fill="#EDE6D8" fillOpacity="0.85" />
<rect x="0" y="492" width="1200" height="68" fill="#0F0C0A" />
<rect x="0" y="0" width="1200" height="560" fill="url(#hwLight)" />
<rect x="0" y="0" width="1200" height="560" fill="url(#hwVignette)" />
</svg>

<span aria-hidden="true" style={{ position: 'absolute', left: '27.67%', top: '37.5%', width: '5.4%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', border: `2px solid ${j1Ring}`, animation: j1Glow }}></span>
<span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '33.2%', width: '6%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', border: `2px solid ${j2Ring}`, animation: j2Glow }}></span>
<span aria-hidden="true" style={{ position: 'absolute', left: '72.33%', top: '37.5%', width: '5.4%', aspectRatio: '1', transform: 'translate(-50%, -50%)', borderRadius: '50%', border: `2px solid ${j3Ring}`, animation: j3Glow }}></span>

<span style={{ position: 'absolute', left: '27.67%', top: '64%', transform: 'translate(-50%, -50%)', padding: '4px 10px', borderRadius: '999px', background: j1PlateBg, color: j1PlateFg, fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '11px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>J2 · SENIOR PUISNE</span>
<span style={{ position: 'absolute', left: '50%', top: '64%', transform: 'translate(-50%, -50%)', padding: '4px 10px', borderRadius: '999px', background: j2PlateBg, color: j2PlateFg, fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '11px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>J1 · PRESIDING</span>
<span style={{ position: 'absolute', left: '72.33%', top: '64%', transform: 'translate(-50%, -50%)', padding: '4px 10px', borderRadius: '999px', background: j3PlateBg, color: j3PlateFg, fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '11px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>J3 · JUNIOR PUISNE</span>

{showChip && (
<div style={{ position: 'absolute', right: '3%', top: '6%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(12, 10, 9, 0.82)', backdropFilter: 'blur(8px)', border: `1px solid ${chipBorder}`, color: chipColor, fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '13px', animation: 'bc-pop 0.35s ease-out' }}>
{chipOk && (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>)}
{chipBad && (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>)}
{chipLabel}
</div>
)}

<div className="bc-float" style={{ position: 'absolute', left: '2.5%', bottom: '5%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px 8px 8px', borderRadius: '999px', background: 'rgba(12, 10, 9, 0.82)', border: `1px solid ${ocBorder}` }}>
<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: '#2A241E', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '15px', color: '#F08A62' }}>OC</span>
<span style={{ fontSize: '13px', color: '#CFC7BA' }}>Learned PP</span>
</div>
<button type="button" className="bc-float" onClick={openWitness} style={{ position: 'absolute', right: '2.5%', bottom: '5%', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '50px', padding: '8px 16px 8px 8px', borderRadius: '999px', background: 'rgba(12, 10, 9, 0.82)', border: `1px ${wStyle} ${wBorder}`, color: '#CFC7BA', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', border: `1px ${wStyle} ${wBorder}`, background: wDot, fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '15px', color: '#F3EEE5' }}>W</span>
{wLabel}
</button>

<div style={{ position: 'absolute', left: '50%', bottom: '5%', transform: 'translateX(-50%)', width: 'min(620px, 56%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 22px 16px', borderRadius: '14px', background: 'rgba(10, 9, 8, 0.82)', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: captionColor }}>{captionWho}</span>
<p style={{ margin: '0', minHeight: '2.4em', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: 'clamp(18px, 1.9vw, 26px)', lineHeight: '1.2', textWrap: 'balance' }}>{captionText}</p>
</div>
</section>

<section aria-label="Your controls" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px', borderRadius: '22px', background: '#1A1714' }}>
<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 20px' }}>
<button type="button" aria-label="Microphone" style={{ position: 'relative', flex: 'none', width: '84px', height: '84px', border: '0', padding: '0', borderRadius: '50%', background: 'transparent', cursor: 'pointer' }}>
<svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" style={{ position: 'absolute', inset: '0' }}>
<circle cx="42" cy="42" r="38" fill="none" stroke="rgba(243, 238, 229, 0.12)" strokeWidth="5" />
<circle cx="42" cy="42" r="38" fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round" stroke-dasharray="238.76" stroke-dashoffset={ringOffset} transform="rotate(-90 42 42)" />
</svg>
<span style={{ position: 'absolute', inset: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: micBg, color: '#FFFFFF' }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" /><path d="M19 11a7 7 0 0 1-14 0" /><path d="M12 18v3" /></svg></span>
</button>

<div style={{ flex: '1 1 240px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
<div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '30px', lineHeight: '1', color: ringColor }}>{clock}</span>
<span style={{ fontSize: '14px', color: '#CFC7BA' }}>{micStatus}</span>
</div>
<div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '30px' }}>
{wave.map((w, i) => (

<span style={{ flex: '1', minWidth: '2px', maxWidth: '6px', height: w.h, borderRadius: '2px', background: waveColor, transformOrigin: 'center', animation: `bc-eq ${w.d} ease-in-out ${w.delay} infinite`, animationPlayState: waveState }}></span>

))}
</div>
</div>

<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
<button type="button" aria-pressed={leave} onClick={toggleLeave} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '48px', padding: '0 18px', borderRadius: '999px', border: '0', background: leaveBg, color: leaveFg, fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>{leaveLabel}</button>
<button type="button" aria-label="Hear Judge Speak" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', border: '0', background: '#2A2520', color: '#F3EEE5', cursor: 'pointer' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg></button>
<button type="button" aria-label="Type instead" aria-pressed={typing} onClick={toggleType} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', border: '0', background: typeBg, color: typeFg, cursor: 'pointer' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01" /><path d="M10 10h.01" /><path d="M14 10h.01" /><path d="M18 10h.01" /><path d="M7 14h10" /></svg></button>
</div>
</div>

{typing && (
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', animation: 'bc-in 0.25s ease-out' }}>
<label htmlFor="hw-type" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Type your submission</label>
<input id="hw-type" type="text" placeholder="My Lords, if I may answer the Bench directly…" style={{ flex: '1 1 280px', minWidth: '0', minHeight: '48px', padding: '0 18px', borderRadius: '999px', border: '1px solid rgba(243, 238, 229, 0.2)', background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '15px' }} />
<button type="button" style={{ minHeight: '48px', padding: '0 18px', borderRadius: '999px', border: '1px solid rgba(243, 238, 229, 0.22)', background: 'transparent', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', cursor: 'pointer' }}>Use a sample</button>
<button type="button" style={{ minHeight: '48px', padding: '0 20px', borderRadius: '999px', border: '0', background: '#F3EEE5', color: '#100E0C', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Submit</button>
</div>
)}
</section>
</main>

<aside aria-label="Hearing record" style={{ flex: '1 1 340px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
{noDrawer && (
<div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '0' }}>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '14px 16px', borderRadius: '18px', background: '#12261B' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '40px', lineHeight: '1', color: '#8FDDAE' }}>{verified}</span>
<span style={{ fontSize: '13px', color: '#B9DCC6' }}>Authorities verified</span>
</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '14px 16px', borderRadius: '18px', background: '#2B1712' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '40px', lineHeight: '1', color: '#FF9F8A' }}>{flagged}</span>
<span style={{ fontSize: '13px', color: '#EBC0B4' }}>Flagged</span>
</div>
</div>
<div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0', borderRadius: '22px', background: '#1A1714' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(243, 238, 229, 0.08)' }}>
<span style={{ fontSize: '15px', fontWeight: '600' }}>Transcript</span>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '12px', color: '#B5ADA0' }}>auto-saved</span>
</div>
<ol style={{ listStyle: 'none', margin: '0', padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '640px' }}>
{entries.map((e, i) => (

<li style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px', animation: 'bc-in 0.3s ease-out' }}>
<span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '11px', letterSpacing: '0.06em', color: e.color }}>{e.who}{e.tag && (<span style={{ padding: '1px 7px', borderRadius: '999px', background: 'rgba(240, 138, 98, 0.16)', color: '#F08A62' }}>{e.tag}</span>)}</span>
<span style={{ fontSize: '14px', color: e.textColor }}>{e.text}</span>
{e.chip && (<span style={{ padding: '3px 10px', borderRadius: '999px', background: e.chipBg, color: e.chipFg, fontSize: '12px', fontWeight: '500' }}>{e.chip}</span>)}
</li>

))}
</ol>
</div>

</div>
)}
{dRecord && (
<section aria-label="Moot problem" style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0', borderRadius: '22px', background: '#F4F0E8', color: '#14120F', animation: 'bc-in 0.25s ease-out' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '18px 18px 12px' }}>
<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '26px', lineHeight: '1.05' }}>Moot problem</span>
<span style={{ fontSize: '13px', color: '#5E574C' }}>Devika Rao v. The State · fictional record</span>
</div>
<button type="button" aria-label="Close moot problem" onClick={closeDrawer} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: '0', background: '#E6DFD2', color: '#14120F', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
</div>
<div role="tablist" aria-label="Record sections" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 18px 12px' }}>
{recTabs.map((t, i) => (

<button type="button" role="tab" aria-selected={t.on} onClick={t.pick} style={{ minHeight: '36px', padding: '0 14px', borderRadius: '999px', border: '0', background: t.bg, color: t.fg, fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>{t.label}</button>

))}
</div>
<ol style={{ listStyle: 'none', margin: '0', padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '640px' }}>
{recItems.map((r, i) => (

<li style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: '8px', fontSize: '14px', lineHeight: '1.55' }}>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '12px', color: '#A83716', paddingTop: '2px' }}>{r.n}</span>
<span>{r.text}</span>
</li>

))}
</ol>
</section>
)}

{dWitness && (
<section aria-label="Witness box" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '0', padding: '18px', borderRadius: '22px', background: '#1A1714', animation: 'bc-in 0.25s ease-out', overflowY: 'auto' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '26px', lineHeight: '1.05' }}>Witness box</span>
<button type="button" aria-label="Close witness box" onClick={closeDrawer} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: '0', background: '#2A2520', color: '#F3EEE5', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
</div>
<ul style={{ listStyle: 'none', margin: '0', padding: '0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
{witnesses.map((w, i) => (

<li style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '16px', background: w.bg, border: `1px solid ${w.border}` }}>
<span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '11px', letterSpacing: '0.06em', color: '#B5ADA0' }}><span>{w.id} · {w.side}</span><span style={{ color: '#8FDDAE' }}>{w.status}</span></span>
<span style={{ fontSize: '15px', fontWeight: '600' }}>{w.name}</span>
<span style={{ fontSize: '13px', color: '#CFC7BA' }}>{w.role}</span>
<button type="button" onClick={w.act} style={{ alignSelf: 'flex-start', minHeight: '40px', padding: '0 16px', borderRadius: '999px', border: '0', background: w.btnBg, color: w.btnFg, fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{w.btn}</button>
</li>

))}
</ul>
<form aria-label="Add a witness" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '16px', border: '1px dashed rgba(243, 238, 229, 0.25)' }}>
<span style={{ fontSize: '15px', fontWeight: '600' }}>Add a witness</span>
<label htmlFor="hw-wname" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#B5ADA0' }}>Name<input id="hw-wname" type="text" value={wName} onChange={(e) => setWName(e.target.value)} placeholder="e.g. Dr. Meera Kulkarni" style={{ minHeight: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(243, 238, 229, 0.18)', background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px' }} /></label>
<label htmlFor="hw-wrole" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#B5ADA0' }}>Role<input id="hw-wrole" type="text" value={wRole} onChange={(e) => setWRole(e.target.value)} placeholder="e.g. Treating doctor, Pune" style={{ minHeight: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(243, 238, 229, 0.18)', background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px' }} /></label>
<label htmlFor="hw-wsays" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#B5ADA0' }}>What they will say<textarea id="hw-wsays" rows="2" value={wSays} onChange={(e) => setWSays(e.target.value)} placeholder="The Applicant was at the hospital with her mother from 19 to 27 March 2025." style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(243, 238, 229, 0.18)', background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', resize: 'vertical' }}></textarea></label>
<button type="button" onClick={addWitness} style={{ minHeight: '44px', borderRadius: '999px', border: '0', background: '#F3EEE5', color: '#100E0C', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Add &amp; call to the box</button>
</form>
</section>
)}

{dAnnex && (
<section aria-label="Annexures" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '0', padding: '18px', borderRadius: '22px', background: '#1A1714', animation: 'bc-in 0.25s ease-out', overflowY: 'auto' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '26px', lineHeight: '1.05' }}>Documents &amp; annexures</span>
<button type="button" aria-label="Close annexures" onClick={closeDrawer} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: '0', background: '#2A2520', color: '#F3EEE5', cursor: 'pointer' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
</div>
<form aria-label="Tender a document" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
<label style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '22px 16px', borderRadius: '16px', border: '1.5px dashed rgba(243, 238, 229, 0.3)', textAlign: 'center', cursor: 'pointer' }}>
<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F3EEE5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="m9 15 3-3 3 3" /></svg>
<span style={{ fontSize: '14px', fontWeight: '500' }}>{aFileLabel}</span>
<span style={{ fontSize: '12px', color: '#B5ADA0' }}>PDF, Word, image or text</span>
<input type="file" accept=".pdf,.docx,.txt,image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; setAFile(f ? f.name : ""); }} style={{ position: 'absolute', inset: '0', opacity: '0', cursor: 'pointer' }} />
</label>
<label htmlFor="hw-atitle" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#B5ADA0' }}>Describe it for the Bench<input id="hw-atitle" type="text" value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="e.g. Hospital admission record, Pune, 19 March 2025" style={{ minHeight: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(243, 238, 229, 0.18)', background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px' }} /></label>
<button type="button" onClick={tender} style={{ minHeight: '44px', borderRadius: '999px', border: '0', background: '#C2421C', color: '#FFFFFF', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Tender to the Bench</button>
</form>
<ul style={{ listStyle: 'none', margin: '0', padding: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
{annexes.map((a, i) => (

<li style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '14px', background: a.bg, animation: 'bc-in 0.3s ease-out' }}>
<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', borderRadius: '10px', background: '#F4F0E8', color: '#14120F', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '12px', fontWeight: '500' }}>{a.id}</span>
<span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
<span style={{ fontSize: '14px', fontWeight: '500' }}>{a.title}</span>
<span style={{ fontSize: '12px', color: a.statusColor }}>{a.status}</span>
</span>
</li>

))}
</ul>
</section>
)}

<p style={{ margin: '0', padding: '0 6px', fontSize: '12px', color: '#8F877B' }}>Practice moot court, not legal advice.</p>
</aside>
</div>
</div>

  );
}

export default HearingWorkspace;
