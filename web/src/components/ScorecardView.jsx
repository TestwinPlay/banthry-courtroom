import React from 'react';
import '../styles/scorecard.css';

export function ScorecardView({ scorecard, onReset }) {
  if (!scorecard) return null;

  return (
    <div className="scorecard-container">
      <div className="scorecard-header">
        <div>
          <h2>Courtroom Oral Advocacy Scorecard</h2>
          <p style={{ color: 'var(--court-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Advocate: <strong>{scorecard.student_name}</strong> ({scorecard.user_role}) • Case: {scorecard.case_title}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--court-gold)' }}>
            Evaluated under Bar Council of India / National Moot Court Competition Standard
          </p>
        </div>

        <div className="score-badge-large">
          <div className="score-num">{scorecard.overall_score}</div>
          <div className="score-max">out of {scorecard.max_possible_score || 100} ({scorecard.percentage}%)</div>
        </div>
      </div>

      {/* Judicial Opinion */}
      <div className="judicial-remarks">
        <strong>Presiding Judge's Bench Observation:</strong>
        <p style={{ marginTop: '6px' }}>"{scorecard.presiding_judge_opinion}"</p>
      </div>

      {/* Rubric Categories */}
      <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--court-gold-light)', marginBottom: '14px' }}>
        Detailed Marking Rubric
      </h3>
      <div className="rubric-grid">
        {scorecard.categories.map((cat, idx) => {
          const pct = Math.round((cat.score / cat.max_score) * 100);
          return (
            <div key={idx} className="rubric-row">
              <div className="rubric-meta">
                <span>{cat.category_name}</span>
                <span>
                  {cat.score} / {cat.max_score} ({pct}%)
                </span>
              </div>

              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="rubric-feedback">{cat.summary_feedback}</div>

              {cat.key_strengths && cat.key_strengths.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#38ef7d' }}>
                  ✓ <strong>Strengths:</strong> {cat.key_strengths.join('; ')}
                </div>
              )}

              {cat.areas_for_improvement && cat.areas_for_improvement.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#ffd2d5' }}>
                  ▲ <strong>Areas to Improve:</strong> {cat.areas_for_improvement.join('; ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* IRAC Analysis */}
      {scorecard.irac && (
        <div className="irac-box">
          <h3>IRAC Structure Analysis</h3>
          <div className="irac-steps">
            <div className="irac-step">
              <div className="irac-step-label">I - Issue Spotting</div>
              <div>{scorecard.irac.issue_identification}</div>
            </div>
            <div className="irac-step">
              <div className="irac-step-label">R - Rule Framing</div>
              <div>{scorecard.irac.rule_articulation}</div>
            </div>
            <div className="irac-step">
              <div className="irac-step-label">A - Application</div>
              <div>{scorecard.irac.analysis_and_application}</div>
            </div>
            <div className="irac-step">
              <div className="irac-step-label">C - Conclusion & Prayer</div>
              <div>{scorecard.irac.conclusion_clarity}</div>
            </div>
          </div>
        </div>
      )}

      {/* Citation Audits */}
      {scorecard.citations_audited && scorecard.citations_audited.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--court-gold-light)', marginBottom: '14px' }}>
            🔍 Grounded Citation Verifications
          </h3>
          <div className="citations-list">
            {scorecard.citations_audited.map((ca, idx) => (
              <div key={idx} className="citation-card">
                <div className="citation-title-row">
                  <span className="citation-name">{ca.case_citation}</span>
                  <span className={`badge ${ca.status === 'VERIFIED_ACCURATE' ? 'badge-verified' : 'badge-overruled'}`}>
                    {ca.status}
                  </span>
                </div>
                <div className="citation-ratio">
                  <strong>Ratio:</strong> {ca.ratio_summary}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#f5d061', marginTop: '4px' }}>
                  <strong>Bench Audit:</strong> {ca.audit_notes}
                </div>
                {ca.grounding_source_url && (
                  <a href={ca.grounding_source_url} target="_blank" rel="noreferrer" className="citation-link">
                    🔗 View Legal Record
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Reading */}
      {scorecard.recommended_reading && scorecard.recommended_reading.length > 0 && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#101726', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--court-gold)', fontSize: '0.9rem', marginBottom: '8px' }}>
            📚 Recommended Reading for Next Hearing
          </h4>
          <ul style={{ paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--court-text-muted)' }}>
            {scorecard.recommended_reading.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button className="btn-primary" onClick={onReset}>
          🏛️ Return to Courtroom / Start New Moot
        </button>
      </div>
    </div>
  );
}
