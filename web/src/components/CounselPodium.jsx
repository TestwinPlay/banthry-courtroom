import React, { useState } from 'react';

export function CounselPodium({
  userRole,
  studentName,
  isRecording,
  volumeLevel,
  onToggleRecording,
  onRaiseObjection,
  onSendTextSpeech,
}) {
  const [textInput, setTextInput] = useState('');

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendTextSpeech(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="podium-card">
      <div className="podium-header">
        <span className="podium-title">
          {studentName} • Counsel for {userRole}
        </span>
        <span style={{ fontSize: '0.8rem', color: isRecording ? '#38ef7d' : 'var(--court-text-muted)' }}>
          {isRecording ? '🎙️ Mic Active' : 'Mic Muted'}
        </span>
      </div>

      <div className="mic-controls">
        <button
          className={`btn-mic ${isRecording ? 'recording' : ''}`}
          onClick={onToggleRecording}
        >
          {isRecording ? '⏹️ Stop Speaking / Yield Floor' : '🎙️ Address the Bench (Live Voice)'}
        </button>

        {isRecording && (
          <div className="waveform-container" title="Microphone Level">
            <div
              className="waveform-bar"
              style={{ width: `${Math.min(100, Math.max(8, volumeLevel * 100))}%` }}
            />
          </div>
        )}

        {/* Text Submission Option */}
        <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            style={{ margin: 0, fontSize: '0.84rem' }}
            placeholder="Or type argument (e.g. 'May it please your Lordships...')"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
            Submit
          </button>
        </form>

        {/* Rapid Procedural Objection Buttons */}
        <div className="action-row">
          <button
            className="btn-objection"
            onClick={() => onRaiseObjection('Relevance', 'Beyond the four corners of moot proposition')}
          >
            ⚠️ Objection: Relevance
          </button>
          <button
            className="btn-objection"
            onClick={() => onRaiseObjection('Misquoting Record', 'Misstating factual record or date of seizure')}
          >
            ⚠️ Misquoting Record
          </button>
          <button
            className="btn-objection"
            onClick={() => onRaiseObjection('Hearsay', 'Inadmissible uncertified digital evidence under BSA 63')}
          >
            ⚠️ Electronic Hearsay
          </button>
        </div>
      </div>
    </div>
  );
}
