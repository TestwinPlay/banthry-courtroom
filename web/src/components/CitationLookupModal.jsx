import React, { useState } from 'react';
import { verifyCitation } from '../services/api';

export function CitationLookupModal({ isOpen, onClose }) {
  const [citationInput, setCitationInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!citationInput.trim()) return;

    setLoading(true);
    setError(null);
    setAuditResult(null);

    try {
      const res = await verifyCitation(citationInput, contextInput);
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Citation verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--court-gold-light)', fontSize: '1.25rem' }}>
            🔍 Google Search Grounded Citation Checker
          </h2>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--court-text-muted)', marginBottom: '16px' }}>
          Verify whether an Indian Supreme Court or High Court citation is authentic, good law, or overruled, grounded in live Google Search results.
        </p>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--court-gold)' }}>Case Title / Official Citation</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. K.S. Puttaswamy v. Union of India (2017) 10 SCC 1"
              value={citationInput}
              onChange={(e) => setCitationInput(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--court-gold)' }}>Point of Law / Proposition Argued</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Proportionality test applies to biometric surveillance under Article 21"
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Searching Court Records & Precedents...' : 'Fact-Check Citation'}
          </button>
        </form>

        {error && (
          <div style={{ color: '#ff6b6b', marginTop: '12px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {auditResult && (
          <div style={{ marginTop: '20px', background: '#121d2d', border: '1px solid #233452', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                {auditResult.case_citation}
              </span>
              <span className={`badge ${auditResult.status === 'VERIFIED_ACCURATE' ? 'badge-connected' : 'badge-live'}`}>
                {auditResult.status}
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--court-gold-light)', marginBottom: '4px' }}>
              Court: {auditResult.court || 'Supreme Court of India'}
            </p>

            <p style={{ fontSize: '0.85rem', color: 'var(--court-text-muted)', marginBottom: '8px' }}>
              <strong>Binding Ratio:</strong> {auditResult.ratio_summary}
            </p>

            <p style={{ fontSize: '0.82rem', color: '#ffd2d5', fontStyle: 'italic' }}>
              <strong>Audit Remarks:</strong> {auditResult.audit_notes}
            </p>

            {auditResult.grounding_source_url && (
              <a
                href={auditResult.grounding_source_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', marginTop: '8px', color: '#63a4ff', fontSize: '0.8rem' }}
              >
                🔗 View Grounded Source Link
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
