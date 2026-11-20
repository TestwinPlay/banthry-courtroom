import React from 'react';

export function ObjectionBanner({ objection, onDismiss }) {
  if (!objection) return null;

  const isSustained = objection.ruling === 'Sustained';

  return (
    <div className="objection-banner">
      <div className="objection-content">
        <h3>⚖️ Objection {objection.ruling}</h3>
        <p style={{ fontSize: '0.86rem', color: '#ffd2d5', marginTop: '2px' }}>
          <strong>Grounds:</strong> {objection.context_text}
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--court-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
          "{objection.judge_remark}"
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className={`ruling-pill ${isSustained ? 'ruling-sustained' : 'ruling-overruled'}`}>
          {objection.ruling}
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
