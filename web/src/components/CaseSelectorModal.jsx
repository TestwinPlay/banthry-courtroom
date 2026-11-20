import React, { useState } from 'react';

export function CaseSelectorModal({ cases, isOpen, onStartSession }) {
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || 'case-bns-privacy-01');
  const [userRole, setUserRole] = useState('Petitioner');
  const [studentName, setStudentName] = useState('Learned Counsel');
  const [difficulty, setDifficulty] = useState('standard');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onStartSession({
      case_id: selectedCaseId,
      user_role: userRole,
      student_name: studentName,
      difficulty_level: difficulty,
    });
  };

  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--court-gold-light)', marginBottom: '8px' }}>
          🏛️ Banthry Courtroom Configuration
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--court-text-muted)', marginBottom: '20px' }}>
          Select an Indian Supreme Court / High Court moot proposition, choose your standing, and step up to the podium.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--court-gold)', fontWeight: 600 }}>
              Select Moot Proposition
            </label>
            <select
              className="input-field"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.court})
                </option>
              ))}
            </select>
          </div>

          {currentCase && (
            <div style={{ background: '#111927', border: '1px solid #233452', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                Summary of Proposition:
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--court-text-muted)', lineHeight: '1.4' }}>
                {currentCase.summary}
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--court-gold)' }}>Statutory Frame: </span>
                <span style={{ fontSize: '0.75rem', color: '#8bb2e8' }}>
                  {currentCase.statutory_provisions?.join(' • ')}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--court-gold)', fontWeight: 600 }}>
                Advocate Name / Title
              </label>
              <input
                type="text"
                className="input-field"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Adv. Aakash Singh"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--court-gold)', fontWeight: 600 }}>
                Standing / Side
              </label>
              <select
                className="input-field"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option value="Petitioner">Petitioner / Appellant</option>
                <option value="Respondent">Respondent / State</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--court-gold)', fontWeight: 600 }}>
              Bench Rigor & Difficulty
            </label>
            <select
              className="input-field"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="standard">Standard (Realistic High Court / Supreme Court Bench)</option>
              <option value="rigorous_senior_bench">Rigorous Constitution Bench (Relentless Judicial Queries)</option>
              <option value="easy">Introductory (Guided Practice with Occasional Queries)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '12px', padding: '12px' }}>
            ⚖️ Call the Matter & Commence Hearing
          </button>
        </form>
      </div>
    </div>
  );
}
