import React from 'react';

export function OpposingCounselView({ opposingRole, latestStatement, isSpeaking }) {
  return (
    <div className="podium-card">
      <div className="podium-header">
        <span className="podium-title">Opposing Counsel ({opposingRole || 'Respondent'})</span>
        <span style={{ fontSize: '0.8rem', color: isSpeaking ? '#ff6b6b' : 'var(--court-text-muted)' }}>
          {isSpeaking ? '🗣️ Objecting...' : 'Ready at Podium'}
        </span>
      </div>

      <div className="opposing-bubble">
        {latestStatement ||
          'Senior Advocate is reviewing the case records and listening to your submissions.'}
      </div>
    </div>
  );
}
