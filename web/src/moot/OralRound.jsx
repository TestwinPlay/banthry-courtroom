// Stage 5: Oral round (text). Setup (bench temper, time), then a typed or dictated exchange with a scripted bench.
// State lives in the parent (useOralRound) so the round and its clock survive switching stages.
import React, { useEffect, useRef, useState } from 'react';
import { DICTATION_SAMPLE, FOLLOW_UPS, JUDGES, QUESTIONS, SIDE_LABEL } from './mootData.js';
import { scoreText } from './mootLogic.js';
import { hearingQuestions } from './memorialCheck.js';
import { CLAY, CLAY_DARK, CLAY_DEEP, DARK_LINE, INK, LINE, MUTED, PAPER, SOFT, SUB, SUBD, WHITE, btn, card, clock, mono } from './ui.js';

const TEMPERS = [['calm', 'Calm bench', 'Lets you finish, few interruptions'], ['hot', 'Hot bench', 'Interrupts on weak points'], ['vhot', 'Very hot bench', 'Fast follow-ups, little patience']];
const TIMES = [[5, '5 minutes', 'Quick drill'], [10, '10 minutes', 'Typical round'], [15, '15 minutes', 'Full round']];
const TEMPER_LABEL = { calm: 'Calm bench', hot: 'Hot bench', vhot: 'Very hot bench' };

export const initialOral = () => ({ temper: 'hot', mins: 10, live: false, tr: [], qn: 0, input: '', left: 600, thinking: false, scores: [] });

/** Holds the text round. `onFinish(scores, qa)` fires after the third answer. */
export function useOralRound({ getSide, getProbes, onFinish }) {
  const [o, setO] = useState(initialOral);
  const ref = useRef(o);
  const timers = useRef({});
  const bench = useRef([]); // this round's questions: memorial-check probes first (max 2), then the scripted ones; still 3
  const patch = (p) => { ref.current = { ...ref.current, ...(typeof p === 'function' ? p(ref.current) : p) }; setO(ref.current); };
  const stop = () => { clearInterval(timers.current.clock); clearTimeout(timers.current.bench); };
  useEffect(() => () => stop(), []);

  const begin = () => {
    stop();
    const qs = hearingQuestions(getProbes?.(), QUESTIONS[getSide()]);
    bench.current = qs;
    patch({ live: true, tr: [{ who: 'J1', t: 'You may begin, counsel.' }, { who: 'J1', t: qs[0] }], qn: 0, scores: [], input: '', thinking: false, left: ref.current.mins * 60 });
    timers.current.clock = setInterval(() => patch((c) => (c.left <= 1 ? (clearInterval(timers.current.clock), { left: 0 }) : { left: c.left - 1 })), 1000);
  };
  const submit = () => {
    const c = ref.current; const t = c.input.trim();
    if (!t || c.thinking || !c.live) return;
    const sc = scoreText(t); const n = c.qn + 1; const qs = bench.current;
    patch({ tr: [...c.tr, { who: 'You', t, sc }], input: '', thinking: true, scores: [...c.scores, sc] });
    clearTimeout(timers.current.bench);
    timers.current.bench = setTimeout(() => {
      if (n >= 3) {
        clearInterval(timers.current.clock);
        const cur = ref.current;
        patch({ thinking: false, live: false, tr: [...cur.tr, { who: 'J2', t: 'Thank you, counsel. We have heard you.' }] });
        const qa = cur.tr.reduce((acc, x, i) => (x.who === 'You' ? [...acc, { q: cur.tr[i - 1]?.t || '', a: x.t, sim: false }] : acc), []);
        onFinish(cur.scores, qa);
        return;
      }
      const follow = c.temper !== 'calm' && sc[1] < 6 ? FOLLOW_UPS[n - 1] : null;
      patch((cur) => ({ thinking: false, qn: n, tr: [...cur.tr, ...(follow ? [{ who: n % 2 ? 'J3' : 'J2', t: follow }] : []), { who: n % 2 ? 'J2' : 'J1', t: qs[n] }] }));
    }, c.temper === 'vhot' ? 700 : 1200);
  };
  const reset = () => { stop(); ref.current = initialOral(); setO(ref.current); };
  return { o, patch, begin, submit, reset };
}

function Setup({ o, patch, begin }) {
  const groups = [['Bench', 'temper', TEMPERS], ['Time', 'mins', TIMES]];
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Oral round</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 14, marginTop: 16 }}>
        {groups.map(([label, key, opts]) => (
          <div key={key} role="radiogroup" aria-label={label} style={{ ...card, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {opts.map(([id, l, d]) => {
                const on = o[key] === id;
                return (
                  <button key={id} type="button" role="radio" aria-checked={on} onClick={() => patch({ [key]: id })}
                    style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 8, padding: '9px 12px', minHeight: 44, fontSize: 13, background: on ? SOFT : WHITE, color: INK, border: `1px solid ${on ? CLAY : LINE}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>{l}</span><span style={{ fontSize: 11, color: MUTED }}>{d}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ ...card, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Judges</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {JUDGES.map(([k, l]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 44, height: 44, borderRadius: 999, background: DARK_LINE, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{k}</span>
                <span style={{ fontSize: 10, color: MUTED }}>{l.replace(' judge', '')}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>Three judges, three questions each side.</div>
        </div>
      </div>
      <button type="button" onClick={begin} style={btn(CLAY, WHITE, { marginTop: 18, borderRadius: 12, padding: '14px 24px', fontSize: 15 })}>Rise and begin</button>
    </div>
  );
}

export default function OralRound({ side, round, speech }) {
  const { o, patch, begin, submit } = round;
  const trRef = useRef(null);
  useEffect(() => { const el = trRef.current; if (el) el.scrollTop = el.scrollHeight; }, [o.tr]);

  // Dictation: the device listens and the words fill the box. No microphone: a sample is typed and labelled.
  const [rec, setRec] = useState(false);
  const [simNote, setSimNote] = useState('');
  const dict = useRef({});
  const stopDict = () => { clearInterval(dict.current.sim); try { speech?.stopListening?.(); } catch { /* not listening */ } setRec(false); };
  useEffect(() => () => { clearInterval(dict.current.sim); try { speech?.stopListening?.(); } catch { /* ignore */ } }, [speech]);
  const sample = (reason) => {
    const w = DICTATION_SAMPLE.split(' '); let i = 0;
    setSimNote(reason === 'mic_denied' ? 'Microphone permission was denied, so a sample answer was typed for you.' : 'Microphone not available here, so a sample answer was typed for you.');
    setRec(true); patch({ input: '' });
    clearInterval(dict.current.sim);
    dict.current.sim = setInterval(() => { i += 1; patch({ input: w.slice(0, i).join(' ') }); if (i >= w.length) { clearInterval(dict.current.sim); setRec(false); } }, 120);
  };
  const mic = () => {
    if (rec) { stopDict(); return; }
    setSimNote('');
    if (!speech?.support?.listen) { sample('unavailable'); return; }
    const base = o.input.trim();
    setRec(true);
    Promise.resolve(speech.listen({
      onPartial: (t) => patch({ input: [base, t].filter(Boolean).join(' ') }),
      onEnd: () => setRec(false),
      onError: (kind) => { setRec(false); sample(kind); },
    })).catch(() => { setRec(false); sample('failed'); });
  };

  if (!o.live) return <Setup o={o} patch={patch} begin={begin} />;
  const last = [...o.tr].reverse().find((t) => t.who !== 'You');
  return (
    <div>
      <div className="moot-dark" style={{ background: INK, color: PAPER, borderRadius: 18, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {JUDGES.map(([k, l]) => {
            const sp = last?.who === k;
            return (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 48, height: 48, borderRadius: 999, background: sp ? CLAY_DARK : DARK_LINE, color: sp ? INK : PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: sp ? '0 0 0 3px rgba(251,138,79,.35)' : 'none' }}>{k}</span>
                <span style={{ fontSize: 10, color: SUBD }}>{l.replace(' judge', '')}</span>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={mono(10, CLAY_DARK)}>{`${TEMPER_LABEL[o.temper]} · QUESTION ${Math.min(3, o.qn + 1)} OF 3 · ${SIDE_LABEL[side]}`.toUpperCase()}</div>
          <div style={{ height: 4, background: DARK_LINE, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(o.qn / 3) * 100}%`, background: CLAY_DARK }} /></div>
        </div>
        <div aria-label="Time left" style={mono(30, o.left < 60 ? CLAY_DARK : PAPER, { letterSpacing: 0 })}>{clock(o.left)}</div>
      </div>
      <div ref={trRef} role="log" aria-label="Transcript" className="moot-scroll" style={{ ...card, marginTop: 14, padding: 18, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {o.tr.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: t.who === 'You' ? 'row-reverse' : 'row' }}>
            <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 999, background: t.who === 'You' ? CLAY : INK, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{t.who}</span>
            <div style={{ maxWidth: '80%', background: t.who === 'You' ? SOFT : PAPER, borderRadius: 12, padding: '10px 13px', fontSize: 14, lineHeight: 1.55 }}>
              {t.t}
              {t.sc && <div style={mono(10, CLAY_DEEP, { marginTop: 6, letterSpacing: '.04em' })}>{`REASONING ${t.sc[0]} · AUTHORITY ${t.sc[1]} · STRUCTURE ${t.sc[3]}`}</div>}
            </div>
          </div>
        ))}
        {o.thinking && <span role="status" style={{ fontSize: 13, color: MUTED }}>The bench confers…</span>}
      </div>
      <div style={{ ...card, borderRadius: 14, marginTop: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea value={o.input} onChange={(e) => patch({ input: e.target.value })} rows={3} aria-label="Your answer" placeholder="My Lords, …  (type, or tap the mic and speak)"
          style={{ width: '100%', border: 0, outline: 'none', resize: 'none', fontSize: 15, lineHeight: 1.5, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" aria-pressed={rec} onClick={mic} style={{ cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: 999, padding: '7px 14px', minHeight: 44, fontSize: 13, background: rec ? CLAY : WHITE, color: rec ? WHITE : INK, border: `1px solid ${INK}` }}>{rec ? '● Listening… tap to stop' : '● Speak'}</button>
          <span style={{ fontSize: 12, color: MUTED }}>Cite authority and answer the question first.</span>
          <button type="button" disabled={!o.input.trim() || o.thinking} onClick={submit} style={btn(CLAY, WHITE, { marginLeft: 'auto', padding: '9px 18px', opacity: !o.input.trim() || o.thinking ? 0.55 : 1 })}>{o.qn >= 2 ? 'Final answer' : 'Answer'}</button>
        </div>
        {simNote && <div role="status" style={{ fontSize: 12, color: SUB }}>{simNote}</div>}
      </div>
    </div>
  );
}
