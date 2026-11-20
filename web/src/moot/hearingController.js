// The live audio hearing as a small state machine, independent of React so it can be tested with fake timers and a
// fake speech device.   idle -> judge (bench speaks) -> listen (60 s) -> think (0.9 s) -> judge -> ... x3 -> done
// `speech` is a device speech object (src/voice/moot/deviceSpeech.js): speak(text, {pitch, rate}), cancelSpeech(),
// listen({onPartial, onEnd, onError}), stopListening(), support.{speak, listen}. On the web it uses speechSynthesis and
// SpeechRecognition; in the app it uses the native plugins (the WebView has no SpeechRecognition).
// The student can always type or correct the answer (type()); speech fills the same box live. If listening is unavailable
// or denied, the box waits for typing; a labelled sample answer is only used when the student asks for it (useSample()).
// Nothing is submitted for the student on silence (owner, 2026-10-25: the hearing must capture what they say).
import { QUESTIONS, SAMPLE_ANSWERS, openingLine } from './mootData.js';
import { reactionFor, scoreText } from './mootLogic.js';
import { hearingQuestions } from './memorialCheck.js';
import { dbg } from '../../voice/moot/micDebug.js';

// stopMs: the longest Stop / Send waits for the last spoken words to be turned into text before it carries on without them.
export const HEARING = { questions: 3, answerSeconds: 60, wordMs: 230, afterCaptionMs: 600, thinkMs: 900, simWordMs: 170, silenceMs: 2500, restarts: 4, stopMs: 4000 };
// `voice` is the judge id the server-side voices are keyed by; device speech ignores it and uses pitch and rate.
export const VOICES = { J1: { pitch: 1, rate: 0.95, voice: 'J1' }, J2: { pitch: 0.85, rate: 1.05, voice: 'J2' }, J3: { pitch: 1.15, rate: 1, voice: 'J3' } };
export const PROBE_SAMPLE = 'My Lords, I accept that the point is fairly put. I will correct the memorial to match the proposition as stated and rely only on what it says.';
export const SIM_NOTES = {
  sample: 'This is a sample answer, not yours. Edit it or send it to see how the bench reacts.',
};
export const MIC_NOTES = {
  mic_denied: 'Microphone permission was denied. Type your answer below, or allow the microphone in Settings to speak it.',
  default: 'Microphone not available here. Type your answer below.',
  silent: 'We can\u2019t hear your microphone. Check that it is allowed and not muted, or type your answer below.',
};
const join = (a, b) => [a, b].filter(Boolean).join(' ').trim();

export const initialHearing = () => ({ phase: 'idle', who: null, cap: '', lastQ: '', qi: 0, heard: '', real: false, sample: false, typing: false, recording: false, stopping: false, level: null, micIssue: null, simReason: null, left: HEARING.answerSeconds, log: [], sc: [] });

/**
 * @param {{speech: object, getSide: () => 'App'|'Res', onChange: (s: object) => void, onFinish?: (scores: number[][], log: object[]) => void}} o
 */
export function createHearing({ speech, getSide, getProbes, onChange, onFinish }) {
  let state = initialHearing();
  let gen = 0; // bumped on every restart or stop: late callbacks from an older turn are ignored
  let ci; let at; let si; let nt; let ft; let gt; let kt; let dead = false;
  let micOn = null; // this turn's "start the microphone again" (the mic button), set by listen()
  // Stopping the microphone is not instant: the last spoken words are still being turned into text. While a stop is pending
  // (state.stopping) that text is still accepted; capTok invalidates a pending stop when the student types, restarts or leaves.
  let capTok = 0; let capP = null; let closing = false;
  const set = (p) => { state = { ...state, ...p }; if (!dead) onChange(state); };
  const cancelCapture = () => { capTok += 1; capP = null; closing = false; clearTimeout(kt); };
  const clearAll = () => { clearInterval(ci); clearInterval(at); clearInterval(si); clearTimeout(nt); clearTimeout(ft); clearTimeout(gt); cancelCapture(); };
  // Ask the engine to stop and wait (bounded) until it has delivered its last words. Never rejects, never waits longer than stopMs.
  const endCapture = () => {
    if (capP) return capP;
    const p = new Promise((resolve) => {
      let r; try { r = speech.stopListening?.(); } catch { r = null; }
      kt = setTimeout(resolve, HEARING.stopMs);
      Promise.resolve(r).then(() => { clearTimeout(kt); resolve(); }, () => { clearTimeout(kt); resolve(); });
    });
    capP = p;
    p.then(() => { if (capP === p) capP = null; });
    return p;
  };
  const quiet = () => { try { speech.cancelSpeech?.(); } catch { /* nothing speaking */ } try { speech.stopListening?.(); } catch { /* not listening */ } };
  // Optional: server-assisted speech holds a session, a socket and audio for one hearing; free it when the hearing is over.
  const release = () => { try { speech.dispose?.(); } catch { /* ignore */ } };
  const stop = () => { gen += 1; clearAll(); quiet(); };
  // The bench's questions for this hearing, fixed at start: memorial-check probes first (max 2), then the scripted ones; still 3.
  let bench = null; let probeCount = 0;
  const qs = () => {
    if (!bench) { const probes = (getProbes?.() || []).slice(0, 2); probeCount = probes.length; bench = hearingQuestions(probes, QUESTIONS[getSide()]); }
    return bench;
  };

  function say(who, text, next) {
    const g = (gen += 1);
    clearAll();
    try { speech.cancelSpeech?.(); } catch { /* ignore */ }
    set({ phase: 'judge', who, cap: '', lastQ: text });
    const w = text.split(' ');
    let i = 0; let captionDone = false; let spoken = !speech.support?.speak;
    const advance = () => {
      if (g !== gen || !captionDone || !spoken) return;
      nt = setTimeout(() => { if (g === gen) next(); }, HEARING.afterCaptionMs);
    };
    if (!spoken) {
      // Some engines never fire `end`: do not wait on speech forever.
      gt = setTimeout(() => { spoken = true; advance(); }, w.length * 450 + 3000);
      Promise.resolve(speech.speak(text, VOICES[who])).catch(() => {}).then(() => { clearTimeout(gt); spoken = true; advance(); });
    }
    ci = setInterval(() => {
      i += 1;
      set({ cap: w.slice(0, i).join(' ') });
      if (i >= w.length) { clearInterval(ci); captionDone = true; advance(); }
    }, HEARING.wordMs);
  }

  function listen() {
    const g = (gen += 1);
    clearAll();
    set({ phase: 'listen', heard: '', left: HEARING.answerSeconds, real: false, sample: false, typing: false, recording: false, stopping: false, level: null, micIssue: null, simReason: null });
    // The answer clock starts once the microphone is live (or known to be unavailable), never while a permission prompt is open.
    let clockOn = false;
    const startClock = () => {
      if (clockOn || g !== gen) return;
      clockOn = true;
      at = setInterval(() => {
        const left = state.left - 1;
        set({ left: Math.max(0, left) });
        if (left <= 0) { clearInterval(at); done(true); }
      }, 1000);
    };

    let base = ''; let restarts = 0;
    const startRec = () => speech.listen({
      onPartial: (t) => {
        if (g !== gen || state.phase !== 'listen') return;
        if (state.typing && !state.stopping) { dbg('partial dropped', { typing: true, len: String(t).length }); return; }
        set({ heard: join(base, t), real: true, sample: false, micIssue: null });
      },
      onEnd: (t) => {
        if (g !== gen || state.phase !== 'listen') return;
        // The last words of a recording the student just stopped: take them, and do not listen again.
        if (state.stopping) { if (t) set({ heard: join(base, t), real: true, sample: false, micIssue: null }); return; }
        if (state.typing) { dbg('end dropped', { typing: true, len: String(t).length }); return; }
        if (t) set({ heard: join(base, t), real: true, sample: false, micIssue: null });
        base = join(base, t); // the recogniser stopped on its own (a pause): keep what was heard and listen again
        if (restarts < HEARING.restarts && state.left > 0) { restarts += 1; startRec(); } else set({ recording: false, level: null });
      },
      onError: (kind) => { if (g !== gen) return; set({ recording: false, stopping: false, level: null }); if (!state.heard) set({ micIssue: kind === 'mic_denied' ? 'mic_denied' : 'default' }); },
      // Optional, only the server-assisted speech reports these: how loud the microphone is, and "nothing but silence for 3 s".
      onLevel: (lv) => { if (g !== gen || state.phase !== 'listen' || !state.recording) return; if (lv !== state.level) set({ level: lv }); },
      onSilent: (quiet) => {
        if (g !== gen || state.phase !== 'listen' || state.typing || state.heard) return;
        if (quiet) set({ micIssue: 'silent' }); else if (state.micIssue === 'silent') set({ micIssue: null });
      },
    });

    const startMic = () => {
      set({ recording: true });
      return Promise.resolve(startRec()).catch(() => { if (g === gen) set({ micIssue: 'default', recording: false }); });
    };
    // The mic button: continue after what is already in the box (typed or heard).
    micOn = () => {
      if (g !== gen || state.phase !== 'listen' || state.stopping || !speech.support?.listen) return;
      base = state.heard.trim(); restarts = 0;
      set({ typing: false, sample: false, simReason: null, micIssue: null, level: null });
      startMic();
    };

    if (!speech.support?.listen) { set({ micIssue: 'default' }); startClock(); return; }
    startMic().finally(startClock);
  }

  function done(timedOut = false) {
    if (state.phase !== 'listen' || closing) return;
    if (!state.recording && !state.stopping) { submit(timedOut); return; }
    // The microphone is still on (or finishing): let the last spoken words become text before the answer is taken.
    const g = gen; const tok = (capTok += 1);
    closing = true;
    set({ recording: false, stopping: true });
    endCapture().then(() => {
      if (tok !== capTok || g !== gen || state.phase !== 'listen') return;
      closing = false;
      set({ stopping: false, level: null });
      // The clock may have run out while this stop was finishing: its own done(true) returned early (closing) and the interval is gone, so
      // the timed-out answer is taken here, or the student would sit at 0 s with nothing happening.
      submit(timedOut || state.left <= 0);
    });
  }

  function submit(timedOut) {
    if (state.phase !== 'listen') return;
    const qi = state.qi;
    const typed = state.heard.trim();
    if (!typed && !timedOut) return; // Send needs an answer; the clock submits an empty one
    const text = typed || '(No answer given)';
    gen += 1; clearAll();
    try { speech.stopListening?.(); } catch { /* ignore */ }
    const sc = scoreText(text);
    const log = [...state.log, { q: state.lastQ, a: text, sc, sim: state.sample }];
    const scs = [...state.sc, sc];
    set({ phase: 'think', log, sc: scs, heard: text });
    const g = gen;
    nt = setTimeout(() => {
      if (g !== gen) return;
      const react = reactionFor(sc, qi);
      if (qi < HEARING.questions - 1) {
        set({ qi: qi + 1 });
        say(qi % 2 ? 'J1' : 'J2', `${react} ${qs()[qi + 1]}`, listen);
      } else {
        say('J1', `${react} Thank you, counsel. We have heard you. Our assessment is on the screen.`, () => { release(); set({ phase: 'done' }); onFinish?.(scs, log); });
      }
    }, HEARING.thinkMs);
  }

  return {
    get state() { return state; },
    /** True when this device (or the server voice) can hear the student, so the Mic button is shown. */
    get canListen() { return !!speech.support?.listen; },
    start() {
      stop();
      bench = null;
      try { speech.begin?.(); } catch { /* optional */ }
      state = initialHearing();
      set({ phase: 'judge' });
      say('J1', `${openingLine(getSide())} ${qs()[0]}`, listen);
    },
    done: () => done(false),
    /** The student types or corrects the answer. Typing pauses the recogniser so it cannot overwrite the text. */
    type(text) {
      if (state.phase !== 'listen') return;
      if (!state.typing) { try { speech.stopListening?.(); } catch { /* not listening */ } }
      cancelCapture();
      set({ heard: String(text), typing: true, stopping: false, recording: false, level: null, real: true, sample: false, simReason: null });
    },
    /** Mic button: stop recording (keep the words), or start again and add to what is in the box. */
    toggleMic() {
      if (state.phase !== 'listen' || state.stopping) return;
      if (state.recording) {
        const g = gen; const tok = (capTok += 1);
        set({ recording: false, stopping: true });
        endCapture().then(() => { if (tok === capTok && g === gen && state.phase === 'listen') set({ stopping: false, typing: true, level: null }); });
        return;
      }
      micOn?.();
    },
    /** Fill the box with this question's sample answer, clearly labelled. Only on request. */
    useSample() {
      if (state.phase !== 'listen') return;
      try { speech.stopListening?.(); } catch { /* not listening */ }
      cancelCapture();
      qs(); // a probe question has no scripted sample; the scripted ones keep theirs
      set({ heard: state.qi < probeCount ? PROBE_SAMPLE : SAMPLE_ANSWERS[getSide()][state.qi - probeCount], typing: true, stopping: false, recording: false, level: null, real: false, sample: true, simReason: 'sample' });
    },
    repeat() {
      if (state.phase !== 'listen') return;
      stop();
      say(state.who || 'J1', state.lastQ || qs()[0], listen);
    },
    end() { stop(); release(); set({ phase: 'done' }); onFinish?.(state.sc, state.log); },
    /** Back to idle with nothing kept (the side or the problem changed). */
    reset() { stop(); release(); bench = null; state = initialHearing(); if (!dead) onChange(state); },
    /** Leaving the screen: cancel speech, stop the recogniser, clear every timer. No further state is published. */
    destroy() { dead = true; stop(); release(); },
  };
}
