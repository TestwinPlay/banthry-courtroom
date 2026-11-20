import React, { useState, useEffect } from 'react';
import { useHearingSocket } from './moot/useHearingSocket.js';
import { getCase, generateCaseFromJudgment } from './services/apiService.js';
import { LandingPage } from './components/LandingPage.jsx';
import { HearingWorkspace } from './components/HearingWorkspace.jsx';
import { ScorecardView } from './components/ScorecardView.jsx';
import './styles/courtroom.css';
import './styles/scorecard.css';

export function App() {
  // Screen stages: 'landing' | 'hearing' | 'scorecard'
  const initialStage =
    typeof window !== 'undefined' && window.location.pathname.includes('hearing')
      ? 'hearing'
      : 'landing';
  const [stage, setStage] = useState(initialStage);
  const [mootCase, setMootCase] = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [side, setSide] = useState('Petitioner');
  const [isGeneratingMoot, setIsGeneratingMoot] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');

  // Live WebSocket hearing hook
  const hearing = useHearingSocket({
    onScorecardReady: () => {
      setStage('scorecard');
    },
  });

  // Load default case on mount
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

  // Judgment upload to fictional moot conversion
  const handleConvertJudgment = async ({ file, text, side: chosenSide }) => {
    if (!file && !text?.trim()) return;
    setIsGeneratingMoot(true);
    setGeneratingStatus('Fictionalizing entities & drafting proposition under BNS/BNSS...');
    try {
      const generated = await generateCaseFromJudgment({
        file,
        text,
        topic: 'Criminal Application under Section 482 BNSS',
      });
      setMootCase(generated);
      if (chosenSide) setSide(chosenSide);
      setGeneratingStatus('✓ Fictional moot problem generated successfully!');
      setTimeout(() => {
        setGeneratingStatus('');
        setStage('hearing');
        hearing.startHearing({ side: chosenSide || side, caseId: generated.id || 'default' });
      }, 1000);
    } catch (err) {
      console.error('Judgment conversion error:', err);
      alert('Could not convert judgment: ' + err.message);
      setGeneratingStatus('');
    } finally {
      setIsGeneratingMoot(false);
    }
  };

  const handleStartHearing = ({ side: chosenSide }) => {
    const finalSide = chosenSide || side;
    setSide(finalSide);
    setStage('hearing');
    if (typeof window !== 'undefined') window.history.pushState(null, '', '/hearing');
    hearing.startHearing({ side: finalSide, caseId: mootCase?.id || 'default' });
  };

  const handleFinishHearing = () => {
    setStage('scorecard');
  };

  const handleArgueAgain = () => {
    setStage('hearing');
    if (typeof window !== 'undefined') window.history.pushState(null, '', '/hearing');
    hearing.startHearing({ side, caseId: mootCase?.id || 'default' });
  };

  const handleBackToLanding = () => {
    setStage('landing');
    if (typeof window !== 'undefined') window.history.pushState(null, '', '/');
  };

  // Fallback scorecard if completed without server payload
  const fallbackScorecard = hearing.scorecard || {
    session_id: 'DEV-2026-HC',
    student_name: 'Counsel for ' + side,
    user_role: side,
    overall_score: 6.9,
    verdict: 'Anticipatory bail granted subject to stringent conditions',
    criteria_scores: {
      'Knowledge of Facts': 7.2,
      'Application of Law (BNS/BNSS)': 6.8,
      'Precedent Handling': 7.5,
      'Responsiveness to Bench': 6.0,
      'Court Demeanor': 7.0,
      'Time Management': 6.5,
      'Structure of Arguments': 7.1,
    },
    strengths: [
      'Accurate reliance on landmark ratios under Arnesh Kumar regarding Section 35(3) BNSS mandatory compliance.',
      'Prompt, respectful acknowledgement of judicial interruptions ("No, My Lord. It was never served.").',
      'Effective differentiation between financial accounting records and requirement of physical custody.',
    ],
    weaknesses: [
      'Spoke past the 35-second threshold before seeking leave on Issue 1.',
      'Did not promptly address Exhibit P-3 undated seizure memo when questioned by Senior Puisne Judge.',
    ],
    roadmap: [
      'Answer judicial questions directly with Yes/No before offering legal justifications.',
      'Memorize paragraph numbers for landmark authorities to answer Junior Puisne Judge instantly.',
    ],
  };

  return (
    <div className="courtroom-root" style={{ minHeight: '100vh', background: '#100E0C', color: '#F3EEE5' }}>
      {stage === 'landing' && (
        <LandingPage
          onStartHearing={handleStartHearing}
          onUploadJudgment={handleConvertJudgment}
          mootCase={mootCase}
          isGeneratingMoot={isGeneratingMoot}
          generatingStatus={generatingStatus}
          side={side}
          setSide={setSide}
        />
      )}

      {stage === 'hearing' && (
        <HearingWorkspace
          mootCase={mootCase}
          side={side}
          hearing={hearing}
          onFinishHearing={handleFinishHearing}
          onBackToLanding={handleBackToLanding}
        />
      )}

      {stage === 'scorecard' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <button
              type="button"
              onClick={handleBackToLanding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 999,
                background: '#231E19',
                color: '#F3EEE5',
                border: '1px solid rgba(243, 238, 229, 0.2)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ← Back to Landing
            </button>
            <button
              type="button"
              onClick={handleArgueAgain}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 999,
                background: '#C2421C',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🔄 Argue Again
            </button>
          </div>
          <ScorecardView scorecard={fallbackScorecard} onReset={handleArgueAgain} />
        </div>
      )}
    </div>
  );
}

export default App;
