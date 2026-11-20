import React from 'react';

export function CourtroomHeader({ session, connectionStatus, onAdjourn, onOpenDossier, onOpenCitationModal }) {
  return (
    <header className="court-header">
      <div className="court-branding">
        <span className="court-seal">🏛️</span>
        <div>
          <h1 className="court-title">BANTHRY COURTROOM</h1>
          <p className="court-subtext">AI Judicial Bench & Trial Simulator • Supreme Court of India</p>
        </div>
      </div>

      <div className="court-header-actions">
        {connectionStatus === 'connected' ? (
          <span className="badge badge-connected">● Live ADK Connected</span>
        ) : connectionStatus === 'connecting' ? (
          <span className="badge">Connecting...</span>
        ) : (
          <span className="badge">Offline</span>
        )}

        <button className="btn-secondary" onClick={onOpenCitationModal} title="Fact-check citations via Google Search Grounding">
          🔍 Verify Citation
        </button>

        <button className="btn-secondary" onClick={onOpenDossier}>
          📑 Moot Docket
        </button>

        {session && (
          <button className="btn-objection" onClick={onAdjourn}>
            ⚖️ Adjourn & Score
          </button>
        )}
      </div>
    </header>
  );
}
