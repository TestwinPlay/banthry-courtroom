import React, { useState, useEffect } from 'react';
import { useHearingSocket } from './moot/useHearingSocket.js';
import { getCase, getExhibitImage, generateCaseFromJudgment } from './services/apiService.js';
import {
  CLAY, CLAY_DARK, DARK_LINE, INK, LINE, LINE_SOFT, LINE_STRONG, MUTED, PAPER, SOFT, STONE, SUB, SUBD, WHITE,
  btn, card, mono, MOOT_CSS,
} from './moot/ui.js';
import { JUDGES, CRITERIA } from './moot/mootData.js';
import { StatutePill, renderLegalText } from './moot/legalHyperlinker.jsx';

export function App() {
  // Screen stages: 'pick' | 'hearing' | 'scorecard'
  const [stage, setStage] = useState('pick');
  const [mootCase, setMootCase] = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [exhibitUrl, setExhibitUrl] = useState(null);
  const [loadingExhibit, setLoadingExhibit] = useState(false);
  const [showExhibitModal, setShowExhibitModal] = useState(false);

  // Side Selection: 'Petitioner' | 'Respondent'
  const [side, setSide] = useState('Petitioner');

  // Judgment Upload / Moot Generation State
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [judgmentFile, setJudgmentFile] = useState(null);
  const [judgmentText, setJudgmentText] = useState('');
  const [isGeneratingMoot, setIsGeneratingMoot] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');

  // Interruption modal state
  const [showInterruptModal, setShowInterruptModal] = useState(false);

  // Hook for live bidi audio hearing
  const hearing = useHearingSocket({
    onScorecardReady: () => {
      setStage('scorecard');
    },
  });

  // Load case on mount
  useEffect(() => {
    getCase()
      .then((data) => {
        setMootCase(data);
        setLoadingCase(false);
      })
      .catch((err) => {
        console.error('Failed to load case:', err);
        setLoadingCase(false);
      });
  }, []);

  // Convert uploaded judgment into fictional moot problem
  const handleConvertJudgment = async () => {
    if (!judgmentFile && !judgmentText.trim()) return;
    setIsGeneratingMoot(true);
    setGeneratingStatus('Case Architect is fictionalizing entities & drafting proposition under BNS/BNSS...');
    try {
      const generated = await generateCaseFromJudgment({
        file: judgmentFile,
        text: judgmentText,
        topic: 'Criminal Application under Section 482 BNSS'
      });
      setMootCase(generated);
      setGeneratingStatus('✓ Fictional moot problem generated successfully!');
      setTimeout(() => {
        setShowUploadSection(false);
        setGeneratingStatus('');
      }, 1200);
    } catch (err) {
      console.error('Judgment conversion error:', err);
      alert('Could not convert judgment: ' + err.message);
      setGeneratingStatus('');
    } finally {
      setIsGeneratingMoot(false);
    }
  };

  // Fetch stamped exhibit
  const handleViewExhibit = async () => {
    setShowExhibitModal(true);
    if (!exhibitUrl) {
      setLoadingExhibit(true);
      try {
        const url = await getExhibitImage(mootCase?.exhibit_prompt);
        setExhibitUrl(url);
      } catch (err) {
        console.error('Failed to load exhibit:', err);
      } finally {
        setLoadingExhibit(false);
      }
    }
  };

  const handleStartHearing = () => {
    setStage('hearing');
    hearing.startHearing({ side, caseId: mootCase?.id || 'default' });
  };

  const handleArgueAgain = () => {
    setStage('pick');
  };

  // Helper formatting for timer
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="moot-v2" style={{ minHeight: '100vh', background: PAPER, color: INK, padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{MOOT_CSS}</style>

      {/* Header Banner */}
      <header style={{ maxWidth: 960, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${LINE}`, paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🏛️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '.02em' }}>BANTHRY COURTROOM</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: SUB }}>AI Moot Court Simulator • High Court of Rajasthan (s. 482 BNSS)</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={mono(11, SUBD, { background: INK, color: PAPER, padding: '4px 10px', borderRadius: 999 })}>
            {stage === 'pick' ? '1. CASE FILE' : stage === 'hearing' ? '2. LIVE HEARING' : '3. SCORECARD'}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* ========================================================================= */}
        {/* SCREEN 1: PICK CASE & PROPOSITION                                         */}
        {/* ========================================================================= */}
        {stage === 'pick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Custom Judgment Ingestion Box */}
            <div style={{ background: '#FAF9F5', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={mono(10, CLAY)}>CUSTOM MOOT GENERATOR</div>
                  <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700 }}>
                    Upload Real Judgment or Paste Legal Ratio
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: SUB }}>
                    Upload any High Court or Supreme Court judgment (PDF, DOCX, TXT) to generate an authentic fictional moot problem under BNS/BNSS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadSection(!showUploadSection)}
                  style={btn(showUploadSection ? INK : WHITE, showUploadSection ? PAPER : INK, { border: `1px solid ${LINE}`, fontSize: 13, padding: '8px 16px' })}
                >
                  {showUploadSection ? '▲ Hide Judgment Uploader' : '📄 Upload Judgment (PDF/DOCX/TXT) ›'}
                </button>
              </div>

              {showUploadSection && (
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 14 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      id="judgment-file-input"
                      onChange={(e) => setJudgmentFile(e.target.files?.[0] || null)}
                      style={{ fontSize: 13 }}
                    />
                    {judgmentFile && (
                      <span style={mono(11, CLAY, { fontWeight: 600 })}>
                        Selected: {judgmentFile.name} ({(judgmentFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  <div>
                    <div style={mono(10, MUTED)}>OR PASTE JUDGMENT TEXT / CITATION RATIO</div>
                    <textarea
                      rows={3}
                      value={judgmentText}
                      onChange={(e) => setJudgmentText(e.target.value)}
                      placeholder="Paste judgment paragraphs or landmark ratio (e.g. 'State of Rajasthan v. Balchand: Bail is the rule and jail is the exception...')"
                      style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleConvertJudgment}
                      disabled={isGeneratingMoot || (!judgmentFile && !judgmentText.trim())}
                      style={btn(CLAY, WHITE, { fontSize: 13, padding: '10px 20px', opacity: isGeneratingMoot || (!judgmentFile && !judgmentText.trim()) ? 0.5 : 1 })}
                    >
                      {isGeneratingMoot ? '⏳ Generating Fictional Problem...' : '✨ Generate Moot Court Problem from Judgment'}
                    </button>
                    {generatingStatus && (
                      <span style={{ fontSize: 12, color: CLAY, fontStyle: 'italic' }}>
                        {generatingStatus}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={mono(10, CLAY)}>URGENT ANTICIPATORY BAIL APPLICATION</div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 2px', fontFamily: 'Georgia, serif' }}>
                    {mootCase?.title || 'Arjun Mehra v. State of Rajasthan'}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: SUB }}>
                    Forum: {mootCase?.forum || 'High Court of Rajasthan at Jodhpur (under s. 482 BNSS)'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, border: '1px solid #fca5a5' }}>
                    FICTIONAL MOOT PROBLEM
                  </span>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    Practice moot court, not legal advice.
                  </span>
                </div>
              </div>

              {/* Parties & Statutes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 16 }}>
                <div style={{ background: SOFT, padding: 12, borderRadius: 10, fontSize: 13 }}>
                  <div style={mono(9, MUTED)}>PARTIES</div>
                  <div style={{ marginTop: 4 }}><strong>Applicant:</strong> {mootCase?.parties?.applicant || 'Arjun Mehra'}</div>
                  <div><strong>Respondent:</strong> {mootCase?.parties?.respondent || 'State of Rajasthan'}</div>
                </div>

                <div style={{ background: SOFT, padding: 12, borderRadius: 10, fontSize: 13 }}>
                  <div style={mono(9, MUTED)}>STATUTES INVOKED (CLICK TO READ LAW ↗)</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(mootCase?.statutes || ['Section 482 BNSS', 'Section 35(3) BNSS', 'Section 318(4) BNS']).map((st, i) => (
                      <StatutePill key={i} statute={st} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Numbered Moot Facts */}
              <div style={{ marginTop: 20 }}>
                <div style={mono(10, MUTED)}>AGREED MOOT RECORD & FACTUAL MATRIX</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {(mootCase?.facts || (mootCase?.proposition_paragraphs?.map(p => p.text)) || [
                    "Arjun Mehra is the Founder and Managing Director of KisanSetu Agritech Pvt. Ltd., registered in Jaipur.",
                    "On 14 November 2024, FIR No. 412/2024 was registered at PS Cyber Crime, Jaipur under Sections 316(2) and 318(4) of the Bharatiya Nyaya Sanhita (BNS), 2023.",
                    "On 10 January 2025, the Investigating Officer dispatched a notice under Section 35(3) BNSS directing appearance within 48 hours.",
                    "The applicant was hospitalized in Delhi with respiratory illness; IO refused deferral request and obtained NBW under Section 73 BNSS."
                  ]).map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5, padding: '8px 12px', background: WHITE, border: `1px solid ${LINE_SOFT}`, borderRadius: 8 }}>
                      <span style={mono(11, CLAY, { fontWeight: 600 })}>{`¶${i + 1}`}</span>
                      <span>{renderLegalText(f)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues for Adjudication */}
              <div style={{ marginTop: 20 }}>
                <div style={mono(10, MUTED)}>SUBSTANTIVE ISSUES</div>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14, color: INK, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(mootCase?.issues || [
                    "Whether an anticipatory bail application under Section 482 BNSS, 2023 is maintainable when an NBW has been issued following medical non-compliance with a Section 35(3) notice.",
                    "Whether custodial interrogation is indispensable in an offense resting predominantly on electronic and banking records.",
                    "Whether the applicant satisfies the triple test for bail under Sushila Aggarwal and P. Chidambaram."
                  ]).map((issue, i) => (
                    <li key={i}>{renderLegalText(issue)}</li>
                  ))}
                </ul>
              </div>

              {/* Select Representation Side */}
              <div style={{ marginTop: 24, borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 18 }}>
                <div style={mono(10, MUTED)}>SELECT YOUR ADVOCACY ROLE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 10 }}>
                  {/* Petitioner Card */}
                  <div
                    onClick={() => setSide('Petitioner')}
                    style={{
                      border: `2px solid ${side === 'Petitioner' ? CLAY : LINE}`,
                      background: side === 'Petitioner' ? '#fff7ed' : WHITE,
                      borderRadius: 12,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: side === 'Petitioner' ? '0 2px 8px rgba(194, 65, 12, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: side === 'Petitioner' ? CLAY : INK }}>
                        ⚖️ Counsel for Petitioner / Applicant
                      </span>
                      {side === 'Petitioner' && (
                        <span style={mono(10, CLAY, { fontWeight: 700, background: '#ffedd5', padding: '3px 8px', borderRadius: 999 })}>
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: SUB, lineHeight: 1.45 }}>
                      Argue for anticipatory bail under s. 482 BNSS, medical notice compliance, and liberty under Article 21. Opposing Counsel will be the Learned Public Prosecutor.
                    </p>
                  </div>

                  {/* Respondent Card */}
                  <div
                    onClick={() => setSide('Respondent')}
                    style={{
                      border: `2px solid ${side === 'Respondent' ? CLAY : LINE}`,
                      background: side === 'Respondent' ? '#fff7ed' : WHITE,
                      borderRadius: 12,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: side === 'Respondent' ? '0 2px 8px rgba(194, 65, 12, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: side === 'Respondent' ? CLAY : INK }}>
                        🛡️ Counsel for Respondent / State
                      </span>
                      {side === 'Respondent' && (
                        <span style={mono(10, CLAY, { fontWeight: 700, background: '#ffedd5', padding: '3px 8px', borderRadius: 999 })}>
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: SUB, lineHeight: 1.45 }}>
                      Argue for custodial interrogation, Section 35(3) breach, and financial subsidy diversion under P. Chidambaram. Opposing Counsel will be Senior Advocate for Petitioner.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleStartHearing}
                  style={btn(CLAY, WHITE, { fontSize: 15, padding: '14px 28px', fontWeight: 600 })}
                >
                  ⚖️ Rise & Argue Before the Bench (as Counsel for {side}) ›
                </button>

                <button
                  type="button"
                  onClick={handleViewExhibit}
                  style={btn(WHITE, INK, { border: `1px solid ${LINE}`, fontSize: 14 })}
                >
                  📑 Inspect Fictional Exhibit (Police S. 35(3) Notice)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: LIVE HEARING (2 MINUTES TIMER + ADK BIDI AUDIO + LIVE VERIFY)   */}
        {/* ========================================================================= */}
        {stage === 'hearing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Hearing Status Box */}
            <div style={{ background: INK, color: PAPER, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={mono(10, CLAY_DARK)}>LIVE AUDIO HEARING • ADK BIDI STREAMING</div>
                  <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 500 }}>
                    Division Bench • Anticipatory Bail Hearing
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={mono(11, WHITE, { background: hearing.phase === 'listen' ? CLAY : DARK_LINE, padding: '6px 12px', borderRadius: 999 })}>
                    {hearing.recording ? '🎙️ MIC STREAMING' : hearing.statusText}
                  </span>
                  <span style={mono(22, CLAY_DARK, { fontWeight: 700 })}>
                    ⏱️ {formatTimer(hearing.timeLeft)}
                  </span>
                </div>
              </div>

              {/* The Courtroom: 3 Judges Bench + Opposing Counsel + Witness Box */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '12px 0', flexWrap: 'wrap' }}>
                {JUDGES.map(([k, label]) => {
                  const isSpeaking = hearing.who === k && hearing.phase === 'judge';
                  return (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: '50%',
                          background: isSpeaking ? CLAY_DARK : DARK_LINE,
                          color: isSpeaking ? INK : PAPER,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 17,
                          fontWeight: 700,
                          transform: isSpeaking ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.3s ease',
                          animation: isSpeaking ? 'mGlow 1.4s infinite' : 'none',
                        }}
                      >
                        {k}
                      </div>
                      <span style={{ fontSize: 11, color: SUBD }}>{label}</span>
                    </div>
                  );
                })}

                {/* Opposing Counsel Seat */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      background: hearing.who === 'opposing_counsel' ? '#d97706' : '#2d3748',
                      color: WHITE,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      border: '2px solid #b45309',
                      transform: hearing.who === 'opposing_counsel' ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    OC
                  </div>
                  <span style={{ fontSize: 11, color: '#fbbf24', textAlign: 'center', maxWidth: 110 }}>
                    {side === 'Petitioner' ? 'Public Prosecutor' : 'Petitioner Counsel'}
                  </span>
                </div>

                {/* Witness Box */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 10,
                      background: hearing.who === 'witness' ? '#059669' : '#1e293b',
                      color: WHITE,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      border: '2px dashed #10b981',
                      transform: hearing.who === 'witness' ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    W
                  </div>
                  <span style={{ fontSize: 11, color: '#34d399' }}>Witness Box</span>
                </div>
              </div>

              {/* Live Caption of the Bench */}
              <div style={{ background: DARK_LINE, borderRadius: 14, padding: '16px 18px', minHeight: 84 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={mono(10, CLAY_DARK)}>
                    {hearing.who ? ({
                      J1: 'HON\'BLE PRESIDING JUDGE',
                      J2: 'HON\'BLE SENIOR PUISNE JUDGE',
                      J3: 'HON\'BLE JUNIOR PUISNE JUDGE',
                      opposing_counsel: side === 'Petitioner' ? 'LEARNED PUBLIC PROSECUTOR (OPPOSING COUNSEL)' : 'LEARNED SENIOR COUNSEL (FOR PETITIONER)',
                      witness: 'WITNESS BOX (INSPECTOR VIKRANT RANE)'
                    })[hearing.who] || 'COURT' : 'BENCH'}
                  </div>
                  <button
                    type="button"
                    onClick={() => hearing.repeatQuestion()}
                    style={btn('transparent', CLAY_DARK, {
                      border: '1px solid #4A4D55',
                      padding: '4px 10px',
                      fontSize: 12,
                      minHeight: 28,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    })}
                    title="Play or replay the judge's spoken words aloud"
                  >
                    🔊 Hear Judge Speak
                  </button>
                </div>
                <div style={{ fontSize: 18, lineHeight: 1.5, marginTop: 6, color: PAPER }}>
                  {hearing.caption || 'The court is in session. The Bench is considering the anticipatory bail petition...'}
                </div>
              </div>

              {/* Counsel Audio / Input Box */}
              <div style={{ border: `1px solid ${hearing.phase === 'listen' ? CLAY_DARK : DARK_LINE}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={mono(10, CLAY_DARK)}>
                    YOU • COUNSEL FOR THE {side.toUpperCase()} ({side === 'Petitioner' ? (mootCase?.parties?.applicant || 'Applicant') : (mootCase?.parties?.respondent || 'State')})
                  </span>

                  {/* Audio Wave Visualizer */}
                  {hearing.recording && (
                    <span style={{ display: 'flex', gap: 3, alignItems: 'center', height: 22 }}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 3,
                            height: 22,
                            borderRadius: 2,
                            background: CLAY_DARK,
                            animation: `mWave ${0.5 + (i % 4) * 0.15}s ease-in-out ${i * 0.05}s infinite`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>

                {/* Typed Answer Textarea (Fallback so demo never dead-ends) */}
                <textarea
                  value={hearing.heard}
                  onChange={(e) => hearing.typeAnswer(e.target.value)}
                  placeholder={side === 'Petitioner'
                    ? 'Speak into your mic, or type your answer here (e.g. "My Lords, the applicant complied with notice and custody is unnecessary under Arnesh Kumar...")'
                    : 'Speak into your mic, or type your answer here (e.g. "My Lords, siphoning of public subsidies requires custodial investigation under P. Chidambaram...")'}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: PAPER,
                    border: 0,
                    outline: 'none',
                    resize: 'none',
                    fontSize: 16,
                    lineHeight: 1.5,
                  }}
                />

                {/* Controls: Mic Toggle & Send Answer */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={hearing.toggleMic}
                    style={btn(hearing.recording ? CLAY : 'transparent', hearing.recording ? WHITE : PAPER, {
                      border: hearing.recording ? 0 : '1px solid #4A4D55',
                      padding: '10px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    })}
                  >
                    {hearing.recording ? '■ Stop Mic' : '🎙️ Speak (16kHz PCM16)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => hearing.submitAnswer()}
                    disabled={!hearing.heard.trim()}
                    style={btn(CLAY, WHITE, {
                      padding: '10px 22px',
                      opacity: hearing.heard.trim() ? 1 : 0.4,
                      fontWeight: 600,
                    })}
                  >
                    Send answer
                  </button>

                  {/* Two-Way Interruption Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowInterruptModal(true)}
                    style={btn('transparent', '#fb923c', { border: '1px solid #c2410c', fontSize: 13, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 })}
                    title="Seek leave to interrupt or interject before the Bench"
                  >
                    ✋ Seek Leave / Interrupt
                  </button>

                  {/* Sample Answer Quick-fills Tailored to Side */}
                  {side === 'Petitioner' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => hearing.typeAnswer('My Lords, under Arnesh Kumar and Sushila Aggarwal, the applicant joined investigation twice; all ledgers are seized and custodial remand is impermissible.')}
                        style={btn('transparent', PAPER, { border: '1px solid #4A4D55', fontSize: 12, padding: '8px 12px' })}
                      >
                        Sample 1 (Arnesh Kumar)
                      </button>
                      <button
                        type="button"
                        onClick={() => hearing.typeAnswer('My Lords, under Satender Kumar Antil and Gurbaksh Singh Sibbia, personal liberty cannot be curbed where there is no flight risk.')}
                        style={btn('transparent', PAPER, { border: '1px solid #4A4D55', fontSize: 12, padding: '8px 12px' })}
                      >
                        Sample 2 (Satender Antil)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => hearing.typeAnswer('My Lords, under P. Chidambaram v. Directorate of Enforcement, economic offenses involving siphoned public subsidies demand custodial interrogation.')}
                        style={btn('transparent', PAPER, { border: '1px solid #4A4D55', fontSize: 12, padding: '8px 12px' })}
                      >
                        Sample 1 (P. Chidambaram)
                      </button>
                      <button
                        type="button"
                        onClick={() => hearing.typeAnswer('My Lords, the applicant deliberately flouted the Section 35(3) notice and attempted to wipe server records, disentitling him to Section 482 protection.')}
                        style={btn('transparent', PAPER, { border: '1px solid #4A4D55', fontSize: 12, padding: '8px 12px' })}
                      >
                        Sample 2 (S. 35(3) Breach)
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => hearing.typeAnswer('My Lords, we rely on Keshav v. State 2024 to argue that digital recovery is never ground for arrest.')}
                    style={btn('transparent', '#ff8b8b', { border: '1px solid #8e2b34', fontSize: 12, padding: '8px 12px' })}
                    title="Test citation checker with a fictional citation"
                  >
                    Test Red Chip
                  </button>

                  <button
                    type="button"
                    onClick={hearing.endHearing}
                    style={btn('transparent', SUBD, { border: '1px solid #333', marginLeft: 'auto', fontSize: 13 })}
                  >
                    Adjourn Hearing ›
                  </button>
                </div>
              </div>

              {/* Real-time Citation Verification Chips */}
              {hearing.latestCitations.length > 0 && (
                <div style={{ background: DARK_LINE, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={mono(10, CLAY_DARK)}>LIVE CITATION AUDIT (CHECKED ON SUBMISSION)</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {hearing.latestCitations.map((cit, idx) => {
                      const isNotFound = cit.status === 'not_found' || cit.status === 'misquoted';
                      return (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: isNotFound ? '#4a1215' : '#143823',
                            color: isNotFound ? '#ff858d' : '#45e687',
                            border: `1px solid ${isNotFound ? '#8a232a' : '#1e6b43'}`,
                          }}
                        >
                          {isNotFound ? `⚠️ Citation not found: "${cit.name}"` : `✓ Verified: ${cit.name}`}
                          {cit.source_url && (
                            <a href={cit.source_url} target="_blank" rel="noreferrer" style={{ color: '#63a4ff', marginLeft: 4 }}>
                              ↗
                            </a>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Hearing Transcript Log */}
            <div style={{ ...card, padding: 18 }}>
              <div style={mono(10, MUTED)}>ARGUMENT LOG ({hearing.qaLog.length} TURNS)</div>
              {hearing.qaLog.length === 0 ? (
                <p style={{ fontSize: 13, color: SUB, margin: '8px 0 0', fontStyle: 'italic' }}>
                  Your answers and citations will appear here as the hearing progresses.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                  {hearing.qaLog.map((item, idx) => (
                    <div key={idx} style={{ paddingBottom: 10, borderBottom: `1px solid ${LINE_SOFT}`, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: CLAY }}>Q{idx + 1}: {item.q}</div>
                      <div style={{ marginTop: 4, color: INK }}><strong>Counsel:</strong> {item.a}</div>
                      {item.citations && item.citations.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {item.citations.map((c, ci) => (
                            <span
                              key={ci}
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: c.status === 'not_found' ? '#fde8e8' : '#e6f7ed',
                                color: c.status === 'not_found' ? '#c5221f' : '#137333',
                                border: `1px solid ${c.status === 'not_found' ? '#f5c2c7' : '#c3e6cb'}`,
                              }}
                            >
                              {c.status === 'not_found' ? `Citation not found: ${c.name}` : `Verified: ${c.name}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: SCORECARD (0-10 RUBRIC, STUDENT QUOTES, JUDICIAL COMMENTS)      */}
        {/* ========================================================================= */}
        {stage === 'scorecard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hearing.isEvaluating ? (
              <div style={{ ...card, padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
                <h3 style={{ fontSize: 20, fontWeight: 600 }}>The Bench is Deliberating in Chambers</h3>
                <p style={{ fontSize: 14, color: SUB, marginTop: 6 }}>
                  The Bench is assessing your oral arguments across authentic appellate criteria and compiling your scorecard...
                </p>
              </div>
            ) : hearing.scorecard ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Overall Score Banner */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', background: INK, color: PAPER, borderRadius: 20, padding: 24 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: DARK_LINE, border: `2px solid ${CLAY_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    ⚖️
                  </div>
                  <div>
                    <div style={mono(10, CLAY_DARK)}>OVERALL BENCH SCORE</div>
                    <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
                      {hearing.scorecard.overall}
                      <span style={{ fontSize: 20, color: SUBD }}>/10</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 240, fontSize: 14, color: PAPER, lineHeight: 1.5 }}>
                    Advocate assessed before the High Court Division Bench in <em>{mootCase?.title || 'Arjun Mehra v. State of Rajasthan'}</em>.
                    <div style={{ fontSize: 12, color: CLAY_DARK, marginTop: 4 }}>
                      {hearing.scorecard.disclaimer || 'Practice moot court, not legal advice.'}
                    </div>
                  </div>
                </div>

                {/* Criteria Marking Grid (0-10) with Student Evidence Quotes */}
                <div style={{ ...card, padding: 20 }}>
                  <div style={mono(10, MUTED)}>DETAILED RUBRIC BREAKDOWN (0 - 10)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                    {[
                      { key: 'legal_reasoning', label: '1. Legal Reasoning', data: hearing.scorecard.scores?.legal_reasoning || hearing.scorecard.scores?.reasoning },
                      { key: 'use_of_authority', label: '2. Use of Authority (BNS/BNSS & SC Precedents)', data: hearing.scorecard.scores?.use_of_authority || hearing.scorecard.scores?.authority },
                      { key: 'responsiveness', label: '3. Responsiveness to the Bench', data: hearing.scorecard.scores?.responsiveness || hearing.scorecard.scores?.answers_the_question },
                      { key: 'handling_difficult_questions', label: '4. Handling Difficult Questions & Interruptions', data: hearing.scorecard.scores?.handling_difficult_questions },
                      { key: 'structure', label: '5. Structure & Advocacy Form', data: hearing.scorecard.scores?.structure },
                      { key: 'court_manner', label: '6. Court Manner & Etiquette', data: hearing.scorecard.scores?.court_manner },
                      { key: 'advocacy', label: '7. Advocacy (Persuasion & Cadence)', data: hearing.scorecard.scores?.advocacy },
                    ].filter(row => row.data != null).map((row) => {
                      const numVal = typeof row.data === 'object' ? row.data.score : (row.data || 7.5);
                      const quote = typeof row.data === 'object' ? row.data.evidence_quote : null;
                      const feedback = typeof row.data === 'object' ? row.data.feedback : null;
                      return (
                        <div key={row.key} style={{ borderBottom: `1px solid ${LINE_SOFT}`, paddingBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{row.label}</span>
                            <span style={mono(12, INK, { fontWeight: 700 })}>{numVal} / 10</span>
                          </div>
                          <div style={{ height: 8, background: STONE, borderRadius: 4, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${(numVal / 10) * 100}%`,
                                background: numVal >= 7.0 ? INK : CLAY,
                                borderRadius: 4,
                              }}
                            />
                          </div>
                          {quote && (
                            <div style={{ fontSize: 12, color: SUB, fontStyle: 'italic', marginTop: 4 }}>
                              " {quote} "
                            </div>
                          )}
                          {feedback && (
                            <div style={{ fontSize: 12, color: INK, marginTop: 2 }}>
                              {renderLegalText(feedback)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Improvement Points */}
                <div style={{ ...card, padding: 20, borderLeft: `4px solid ${CLAY}` }}>
                  <div style={mono(10, CLAY)}>THREE KEY IMPROVEMENT POINTS</div>
                  <ol style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 14, color: INK, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(hearing.scorecard.improvements || hearing.scorecard.improvement_points || [
                      "Verify all citations against official law reports before submitting them to the bench.",
                      "Quote specific paragraph numbers when relying on landmark precedents.",
                      "Address the economic gravity argument directly before retreating to personal liberty."
                    ]).map((pt, i) => (
                      <li key={i}>{renderLegalText(pt)}</li>
                    ))}
                  </ol>
                </div>

                {/* One Comment Per Judge */}
                {hearing.scorecard.judge_comments && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    {Object.entries(hearing.scorecard.judge_comments).map(([judgeCode, comment]) => (
                      <div key={judgeCode} style={{ ...card, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 26, height: 26, borderRadius: '50%', background: INK, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                            {judgeCode}
                          </span>
                          <span style={mono(10, MUTED)}>
                            {judgeCode === 'J1' ? 'PRESIDING JUDGE' : judgeCode === 'J2' ? 'JUDGE 2' : judgeCode === 'J3' ? 'JUDGE 3' : judgeCode}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: INK, fontStyle: 'italic' }}>
                          "{renderLegalText(comment)}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleArgueAgain}
                    style={btn(CLAY, WHITE, { fontSize: 15, padding: '14px 26px' })}
                  >
                    🏛️ Argue Another Case
                  </button>
                  <span style={{ fontSize: 12, color: MUTED }}>
                    Practice moot court, not legal advice.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* INTERRUPT / SEEK LEAVE MODAL                                              */}
      {/* ========================================================================= */}
      {showInterruptModal && (
        <div
          onClick={() => setShowInterruptModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: INK,
              color: PAPER,
              borderRadius: 16,
              maxWidth: 580,
              width: '100%',
              padding: 24,
              border: '1px solid #4A4D55',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={mono(10, CLAY_DARK)}>ORAL ADVOCACY • SEEK LEAVE TO INTERRUPT</div>
              <button
                type="button"
                onClick={() => setShowInterruptModal(false)}
                style={{ border: 0, background: 'none', color: PAPER, fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600 }}>
              Respectfully Interject Before the Bench
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: SUBD, lineHeight: 1.4 }}>
              Select a genuine appellate interjection or type your clarification. The Bench will pause, acknowledge your interjection, and test your submission.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                "With the Court's utmost leave, may Counsel address that query directly?",
                "My Lords, may Counsel interject: Section 35(3) was complied with bona fide under medical hospitalization.",
                "Objection, My Lords! Opposing Counsel misquotes Paragraph 4 of the agreed factual matrix.",
                "With respect, My Lords, under Arnesh Kumar and Satender Antil, custodial detention is legally impermissible here.",
                "May it please your Lordships, Counsel seeks leave to direct attention to the statutory proviso."
              ].map((phrase, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    hearing.interrupt(phrase);
                    setShowInterruptModal(false);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: DARK_LINE,
                    color: PAPER,
                    border: '1px solid #4A4D55',
                    fontSize: 13,
                    cursor: 'pointer',
                    lineHeight: 1.4,
                  }}
                >
                  💬 "{phrase}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fictional Stamped Exhibit */}
      {showExhibitModal && (
        <div
          onClick={() => setShowExhibitModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: WHITE,
              borderRadius: 16,
              maxWidth: 640,
              width: '100%',
              padding: 20,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={mono(10, CLAY)}>FICTIONAL EVIDENCE EXHIBIT</div>
              <button
                type="button"
                onClick={() => setShowExhibitModal(false)}
                style={{ border: 0, background: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {loadingExhibit ? (
              <div style={{ padding: 40, textAlign: 'center', color: SUB }}>
                Generating and stamping fictional exhibit with official watermark...
              </div>
            ) : exhibitUrl ? (
              <img
                src={exhibitUrl}
                alt="Fictional Courtroom Exhibit"
                style={{ width: '100%', height: 'auto', borderRadius: 8, border: `1px solid ${LINE}` }}
              />
            ) : (
              <div style={{ color: SUB, textAlign: 'center', padding: 20 }}>
                Could not generate exhibit.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
