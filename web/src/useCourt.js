import { useCallback, useEffect, useRef, useState } from 'react';
import { idToken } from './firebase.js';
import { evaluateHearing } from './services/apiService.js';

// Seconds counsel may speak before the Bench cuts in (matches the 40 s ring in the workspace).
export const CUT_IN_SECS = 40;

const WHO_MAP = { opposing_counsel: 'OC', witness: 'W', clerk: 'CLERK' };
const normWho = (w) => WHO_MAP[w] || (['J1', 'J2', 'J3'].includes(w) ? w : 'J1');
const OK_STATUSES = new Set(['verified']);
let nextId = 1;

/**
 * Live hearing over /ws/hearing: streams 16 kHz PCM mic audio to Gemini Live, plays 24 kHz Bench audio,
 * keeps the running transcript and citation chips, and asks the Bench to cut in after CUT_IN_SECS.
 */
export function useCourt() {
  const [connected, setConnected] = useState(false);
  const [speaking, setSpeaking] = useState(null); // who is on the floor: J1 | J2 | J3 | OC | W | ADV | null
  const [caption, setCaption] = useState('');
  const [entries, setEntries] = useState([]);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [counselSecs, setCounselSecs] = useState(0);
  const [leave, setLeave] = useState(false);
  const [scorecard, setScorecard] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');

  const ws = useRef(null);
  const playCtx = useRef(null);
  const playAt = useRef(0);
  const sources = useRef([]);
  const turnAudio = useRef([]);
  const gotAudio = useRef(false);
  const mic = useRef(null);
  const cutInSent = useRef(false);
  const entriesRef = useRef([]);
  entriesRef.current = entries;
  const speakingRef = useRef(speaking); speakingRef.current = speaking;
  const levelRef = useRef(level); levelRef.current = level;
  const leaveRef = useRef(leave); leaveRef.current = leave;

  const push = useCallback((e) => setEntries((list) => [...list, { id: nextId++, ...e }]), []);
  const send = useCallback((obj) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(obj));
  }, []);

  // ---- Bench audio -------------------------------------------------------
  const ensurePlayCtx = () => {
    if (!playCtx.current || playCtx.current.state === 'closed') {
      playCtx.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      playAt.current = 0;
    }
    if (playCtx.current.state === 'suspended') playCtx.current.resume();
    return playCtx.current;
  };

  const playChunk = useCallback((b64) => {
    const ctx = ensurePlayCtx();
    const bin = atob(b64);
    const n = bin.length >> 1;
    if (!n) return;
    const view = new DataView(new ArrayBuffer(n * 2));
    for (let i = 0; i < n * 2; i++) view.setUint8(i, bin.charCodeAt(i));
    const f32 = new Float32Array(n);
    for (let i = 0; i < n; i++) f32[i] = view.getInt16(i * 2, true) / 32768;
    const buf = ctx.createBuffer(1, n, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const at = Math.max(ctx.currentTime, playAt.current);
    src.start(at);
    playAt.current = at + buf.duration;
    sources.current.push(src);
    src.onended = () => { sources.current = sources.current.filter((s) => s !== src); };
  }, []);

  const stopAudio = useCallback(() => {
    sources.current.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    sources.current = [];
    playAt.current = 0;
    window.speechSynthesis?.cancel();
  }, []);

  // Fallback voice when the Live session is down and only text comes back.
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang === 'en-IN') || voices.find((v) => v.lang === 'en-GB') || null;
    window.speechSynthesis.speak(u);
  };

  // ---- Microphone --------------------------------------------------------
  const stopMic = useCallback(() => {
    const m = mic.current;
    if (m) {
      try { m.proc.disconnect(); m.src.disconnect(); m.ctx.close(); } catch { /* closed */ }
      m.stream.getTracks().forEach((t) => t.stop());
    }
    mic.current = null;
    setRecording(false);
    setLevel(0);
  }, []);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const src = ctx.createMediaStreamSource(stream);
      // ponytail: ScriptProcessor is deprecated but universally supported; move to an AudioWorklet if it glitches.
      const proc = ctx.createScriptProcessor(2048, 1, 1);
      proc.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0);
        let sum = 0;
        const pcm = new Int16Array(d.length);
        for (let i = 0; i < d.length; i++) {
          const s = Math.max(-1, Math.min(1, d[i]));
          sum += s * s;
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        setLevel(Math.min(1, Math.sqrt(sum / d.length) * 6));
        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(pcm.buffer);
      };
      src.connect(proc);
      proc.connect(ctx.destination);
      mic.current = { stream, ctx, src, proc };
      setRecording(true);
      setError('');
    } catch {
      setError('Microphone blocked. Allow mic access, or type your submission instead.');
    }
  }, []);

  const toggleMic = useCallback(() => (mic.current ? stopMic() : startMic()), [startMic, stopMic]);

  // ---- Socket ------------------------------------------------------------
  const start = useCallback(async ({ side, caseId }) => {
    ensurePlayCtx(); // unlock audio inside the click
    setEntries([]); setScorecard(null); setError(''); setCaption(''); setCounselSecs(0);
    const token = await idToken();
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const q = new URLSearchParams({ side, case_id: caseId || 'default', token });
    const sock = new WebSocket(`${proto}//${location.host}/ws/hearing?${q}`);
    ws.current = sock;

    sock.onopen = () => { setConnected(true); startMic(); };
    sock.onclose = (e) => {
      setConnected(false);
      stopMic();
      if (e.code === 4401) setError('Your session expired. Sign in again.');
    };
    sock.onerror = () => setError('Lost the connection to the courtroom. Refresh to rejoin.');
    sock.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      switch (msg.type) {
        case 'caption':
          setSpeaking(normWho(msg.who));
          setCaption(msg.text);
          setCounselSecs(0);
          cutInSent.current = false;
          break;
        case 'audio':
          if (!gotAudio.current) turnAudio.current = []; // first chunk of a new Bench turn
          gotAudio.current = true;
          turnAudio.current.push(msg.audio);
          playChunk(msg.audio);
          break;
        case 'interrupted':
          stopAudio();
          break;
        case 'counsel_caption':
          setSpeaking('ADV');
          setCaption(msg.text);
          break;
        case 'counsel_transcript':
          push({ who: 'ADV', text: msg.text });
          break;
        case 'transcript': {
          const who = normWho(msg.who);
          push({ who, text: msg.text, tag: msg.tag });
          setSpeaking(who);
          setCaption(msg.text);
          if (!gotAudio.current && who !== 'CLERK') speakText(msg.text);
          break;
        }
        case 'turn_complete':
          gotAudio.current = false;
          setLeave(false);
          setTimeout(() => setSpeaking((s) => (s === 'ADV' ? s : null)), 400);
          break;
        case 'citation_flag': {
          const ok = OK_STATUSES.has(msg.status);
          const label = `${msg.name} · ${ok ? 'verified' : msg.status === 'not_found' ? 'not found' : 'unconfirmed'}`;
          setEntries((list) => {
            const i = list.map((e) => e.who).lastIndexOf('ADV');
            if (i < 0) return [...list, { id: nextId++, who: 'CLERK', text: `Authority cited: ${msg.name}`, chip: { label, ok } }];
            const copy = list.slice();
            copy[i] = { ...copy[i], chips: [...(copy[i].chips || []), { label, ok }] };
            return copy;
          });
          break;
        }
        default:
      }
    };
  }, [playChunk, push, startMic, stopAudio, stopMic]);

  // Counsel speaking clock: counts while counsel has the floor and the mic hears them.
  useEffect(() => {
    if (!connected) return undefined;
    const t = setInterval(() => {
      setCounselSecs((s) => {
        const counselHasFloor = speakingRef.current === 'ADV' || (speakingRef.current === null && levelRef.current > 0.05);
        if (!counselHasFloor || leaveRef.current) return s;
        const next = s + 1;
        if (next >= CUT_IN_SECS && !cutInSent.current) {
          cutInSent.current = true;
          send({ type: 'cut_in' });
          push({ who: 'CLERK', text: `Counsel passed ${CUT_IN_SECS} seconds.`, tag: `cut in at 0:${CUT_IN_SECS}` });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [connected, push, send]);

  // ---- Counsel actions ---------------------------------------------------
  const submit = useCallback((text) => {
    const t = text.trim();
    if (!t) return;
    stopAudio();
    push({ who: 'ADV', text: t });
    send({ type: 'text', text: t });
    setCounselSecs(0);
  }, [push, send, stopAudio]);

  const seekLeave = useCallback(() => {
    stopAudio();
    setLeave(true);
    setCounselSecs(0);
    cutInSent.current = false;
    send({ type: 'interrupt', text: 'With respect, My Lords, may I address that point directly?' });
  }, [send, stopAudio]);

  const callWitness = useCallback((w) => send({ type: 'call_witness', name: w.name, role: w.role, says: w.says || '' }), [send]);
  const releaseWitness = useCallback((w) => {
    push({ who: 'CLERK', text: `${w.id} ${w.name} steps down from the witness box.` });
    send({ type: 'release_witness' });
  }, [push, send]);
  const tender = useCallback((a) => {
    push({ who: 'CLERK', text: `Counsel tenders Annexure ${a.id} — ${a.title}.`, tag: 'annexure', chip: { label: `${a.id} · ${a.title}`, ok: null } });
    send({ type: 'tender', id: a.id, title: a.title });
  }, [push, send]);

  const replay = useCallback(() => {
    stopAudio();
    if (turnAudio.current.length) turnAudio.current.forEach(playChunk);
    else if (caption) speakText(caption);
  }, [caption, playChunk, stopAudio]);

  const rest = useCallback(async (caseContext) => {
    stopMic();
    stopAudio();
    ws.current?.close();
    setEvaluating(true);
    setError('');
    try {
      const list = entriesRef.current;
      const transcript = list.filter((e) => e.who !== 'CLERK').map((e) => ({ speaker: e.who === 'ADV' ? 'counsel' : e.who, text: e.text }));
      const flagged = list.flatMap((e) => (e.chips || []).filter((c) => !c.ok).map((c) => ({ name: c.label.split(' · ')[0], status: 'not_found', reason: 'Not found in the law reports checked' })));
      setScorecard(await evaluateHearing({ transcript, case_context: caseContext, flagged_citations: flagged }));
    } catch {
      setError('The Bench could not prepare your scorecard. Try again.');
    } finally {
      setEvaluating(false);
    }
  }, [stopAudio, stopMic]);

  useEffect(() => () => { ws.current?.close(); stopMic(); stopAudio(); playCtx.current?.close(); }, [stopAudio, stopMic]);

  return {
    connected, speaking, caption, entries, recording, level, counselSecs, leave, scorecard, evaluating, error,
    start, toggleMic, submit, seekLeave, callWitness, releaseWitness, tender, replay, rest,
  };
}
