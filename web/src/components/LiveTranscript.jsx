import React, { useEffect, useRef } from 'react';

export function LiveTranscript({ turns }) {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [turns]);

  return (
    <div className="transcript-panel">
      <div className="panel-header">
        <span>Courtroom Stenography Record (Live Transcript)</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)' }}>
          {turns.length} turns recorded
        </span>
      </div>

      <div className="transcript-feed" ref={feedRef}>
        {turns.length === 0 ? (
          <div style={{ color: 'var(--court-text-muted)', fontStyle: 'italic', padding: '12px' }}>
            Proceedings ready to commence. Unmute microphone or submit your opening argument.
          </div>
        ) : (
          turns.map((turn, idx) => {
            const isJudge = turn.speaker.toLowerCase().includes('judge') || turn.speaker.toLowerCase().includes('court');
            const isCounsel = turn.speaker.toLowerCase().includes('counsel for') || turn.speaker.toLowerCase().includes('student');
            const turnClass = isJudge ? 'turn-judge' : isCounsel ? 'turn-counsel' : 'turn-opposing';

            return (
              <div key={idx} className={`transcript-turn ${turnClass}`}>
                <div className="turn-header">
                  <span>{turn.speaker}</span>
                  <span style={{ color: 'var(--court-text-muted)', fontSize: '0.72rem' }}>
                    {turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
                <div style={{ color: '#fff' }}>{turn.text}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
