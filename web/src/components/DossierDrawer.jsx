import React from 'react';

export function DossierDrawer({ mootCase, isOpen, onClose }) {
  if (!isOpen || !mootCase) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--court-gold-light)' }}>
            Case Dossier & Fact Record
          </h2>
          <button className="btn-secondary" onClick={onClose}>✕ Close</button>
        </div>

        <div className="dossier-card">
          <div className="dossier-section">
            <h4>Case Title</h4>
            <p style={{ fontWeight: 600, color: '#fff' }}>{mootCase.title}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--court-text-muted)' }}>
              {mootCase.court} • {mootCase.bench_composition}
            </p>
          </div>

          <div className="dossier-section">
            <h4>Summary</h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--court-text-muted)' }}>{mootCase.summary}</p>
          </div>

          <div className="dossier-section">
            <h4>Agreed Moot Facts</h4>
            <ul>
              {mootCase.facts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </div>

          <div className="dossier-section">
            <h4>Issues for Adjudication</h4>
            <ul>
              {mootCase.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>

          <div className="dossier-section">
            <h4>Statutory Provisions Invoked</h4>
            <div>
              {mootCase.statutory_provisions.map((prov, i) => (
                <span key={i} className="statute-tag">
                  {prov}
                </span>
              ))}
            </div>
          </div>

          <div className="dossier-section">
            <h4>Key Judicial Precedents</h4>
            <ul>
              {mootCase.key_precedents.map((prec, i) => (
                <li key={i}>{prec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
