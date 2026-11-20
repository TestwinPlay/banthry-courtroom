import React from 'react';

export function BenchView({ benchState, latestInterjection, courtName, benchComposition }) {
  const isSpeaking = benchState === 'speaking';
  const isRuling = benchState === 'ruling';

  return (
    <div className="bench-view">
      <div className="bench-emblem">⚖️</div>
      <h2 className="bench-title">{courtName || 'Supreme Court of India'}</h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--court-text-muted)' }}>
        {benchComposition || 'Division Bench • Courtroom No. 1'}
      </p>

      <div className={`bench-avatar ${isSpeaking ? 'speaking' : ''}`}>
        {isRuling ? '🔨' : '👨‍⚖️'}
      </div>

      <div className="judge-status-pill">
        {isSpeaking
          ? 'Hon\'ble Presiding Justice Speaking...'
          : isRuling
          ? 'Bench Ruling on Objection...'
          : 'Bench is Attentively Hearing Counsel'}
      </div>

      {latestInterjection && (
        <div className="judge-interjection-box">
          <span style={{ fontWeight: 700, fontStyle: 'normal', color: 'var(--court-gold)' }}>
            Presiding Justice:{' '}
          </span>
          "{latestInterjection}"
        </div>
      )}
    </div>
  );
}
