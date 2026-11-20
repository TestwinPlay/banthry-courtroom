import { useState, useEffect, useRef, useCallback } from 'react';
import { verifyCitations, evaluateHearing } from '../services/apiService.js';

export function useHearingSocket({ onScorecardReady } = {}) {
  const [phase, setPhase] = useState('idle'); // idle | judge | listen | think | done
  const [who, setWho] = useState('J1');
  const [caption, setCaption] = useState('');
  const [heard, setHeard] = useState('');
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes hearing
  const [qaLog, setQaLog] = useState([]);
  const [latestCitations, setLatestCitations] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [statusText, setStatusText] = useState('NOT STARTED');

  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const timerRef = useRef(null);
  const currentQRef = useRef('');
  const currentWhoRef = useRef('J1');
  const turnAudioChunksRef = useRef([]);
  const hasReceivedAudioForTurnRef = useRef(false);

  // Pre-load available synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // 1. Audio Player for returned PCM16/base64 chunks
  const playAudioChunk = useCallback((base64Audio) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
        nextPlayTimeRef.current = audioCtxRef.current.currentTime;
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const binaryStr = window.atob(base64Audio);
      const len = binaryStr.length;
      const validLen = len - (len % 2);
      if (validLen === 0) return;

      const bytes = new Uint8Array(validLen);
      for (let i = 0; i < validLen; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer, 0, validLen / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = audioCtxRef.current.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const src = audioCtxRef.current.createBufferSource();
      src.buffer = buffer;
      src.connect(audioCtxRef.current.destination);

      const startTime = Math.max(audioCtxRef.current.currentTime, nextPlayTimeRef.current);
      src.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
    } catch (err) {
      console.warn('Audio playback notice:', err);
    }
  }, []);

  // 2. High-Fidelity Speech Synthesis for the Judge's Voice
  const speakJudgeVoice = useCallback((text, judgeCode = 'J1') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices() || [];
      // Prefer Indian English voice, then British/UK, then US English
      const preferredVoice =
        voices.find((v) => v.lang === 'en-IN' || v.lang.includes('IN')) ||
        voices.find((v) => v.lang === 'en-GB' || v.lang.includes('GB')) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Voice modulation per judge
      if (judgeCode === 'J1') {
        utterance.pitch = 0.88; // Deep, commanding Presiding Judge
        utterance.rate = 0.95;
      } else if (judgeCode === 'J2') {
        utterance.pitch = 1.05; // Sharp Senior Judge
        utterance.rate = 1.0;
      } else {
        utterance.pitch = 1.0; // Calm Puisne Judge
        utterance.rate = 0.92;
      }

      utterance.onstart = () => {
        setPhase('judge');
        setStatusText('BENCH SPEAKING');
      };

      utterance.onend = () => {
        setPhase('listen');
        setStatusText('LISTENING');
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis event:', e);
        setPhase('listen');
        setStatusText('LISTENING');
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setTimeout(() => {
        setPhase('listen');
        setStatusText('LISTENING');
      }, 3000);
    }
  }, []);

  // 3. Microphone capture: 16 kHz PCM16 mono streaming
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const micCtx = new AudioCtxClass({ sampleRate: 16000 });
      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(2048, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Volume calculation for animated waveform
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        setLevel(Math.min(1, rms * 6));

        // Convert Float32 to 16-bit Linear PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(micCtx.destination);
      processorRef.current = { processor, micCtx, source };
      setRecording(true);
    } catch (err) {
      console.warn('Mic access failed, falling back to typed answers:', err);
      setRecording(false);
    }
  }, []);

  const stopMic = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.processor.disconnect();
        processorRef.current.source.disconnect();
        processorRef.current.micCtx.close();
      } catch (e) {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setRecording(false);
    setLevel(0);
  }, []);

  const toggleMic = useCallback(() => {
    if (recording) {
      stopMic();
    } else {
      startMic();
    }
  }, [recording, startMic, stopMic]);

  // 4. Evaluate hearing
  const finishHearing = useCallback(async (currentLog) => {
    stopMic();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPhase('done');
    setStatusText('HEARING OVER');
    setIsEvaluating(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const logToEvaluate = currentLog && currentLog.length ? currentLog : qaLog;
      const formattedTranscript = [];
      for (const entry of logToEvaluate) {
        if (entry.q) formattedTranscript.push({ speaker: 'J1', text: entry.q });
        if (entry.a) formattedTranscript.push({ speaker: 'counsel', text: entry.a });
      }

      const result = await evaluateHearing({
        transcript: formattedTranscript.length > 0 ? formattedTranscript : [
          { speaker: 'J1', text: 'Counsel, why did you fail to comply with Section 35(3) notice?' },
          { speaker: 'counsel', text: 'My Lords, the applicant cooperated fully.' }
        ],
        qa: logToEvaluate,
        side: 'App',
      });
      setScorecard(result);
      if (onScorecardReady) onScorecardReady(result);
    } catch (err) {
      console.error('Failed to evaluate hearing:', err);
    } finally {
      setIsEvaluating(false);
    }
  }, [qaLog, onScorecardReady, stopMic]);

  // 5. Start Hearing & WebSocket Connection
  const startHearing = useCallback((options = {}) => {
    const chosenSide = options.side || 'Petitioner';
    const chosenCaseId = options.caseId || 'default';

    // Prime Web Audio and SpeechSynthesis inside the user gesture click!
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const prime = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(prime);
    }

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    setPhase('judge');
    setStatusText('BENCH SPEAKING');
    setTimeLeft(120);
    setQaLog([]);
    setLatestCitations([]);
    setScorecard(null);
    setHeard('');
    turnAudioChunksRef.current = [];
    hasReceivedAudioForTurnRef.current = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/ws/hearing?side=${encodeURIComponent(chosenSide)}&case_id=${encodeURIComponent(chosenCaseId)}`);
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;

    socket.onopen = () => {
      // 2-minute countdown timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishHearing();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'caption') {
          if (msg.who) setWho(msg.who);
          setPhase('judge');
          setStatusText('BENCH SPEAKING');
          setCaption(msg.text);
          currentQRef.current = msg.text;
          if (msg.who) currentWhoRef.current = msg.who;
        } else if (msg.type === 'audio' && msg.audio) {
          hasReceivedAudioForTurnRef.current = true;
          turnAudioChunksRef.current.push(msg.audio);
          setPhase('judge');
          setStatusText('BENCH SPEAKING');
          playAudioChunk(msg.audio);
        } else if (msg.type === 'transcript') {
          const judgeWho = msg.who || 'J1';
          setWho(judgeWho);
          setCaption(msg.text);
          currentQRef.current = msg.text;
          currentWhoRef.current = judgeWho;

          // If no live Gemini audio was received for this turn, fall back to speech synthesis
          if (!hasReceivedAudioForTurnRef.current) {
            speakJudgeVoice(msg.text, judgeWho);
          }
        } else if (msg.type === 'turn_complete') {
          const remainingAudio = audioCtxRef.current
            ? Math.max(0, (nextPlayTimeRef.current - audioCtxRef.current.currentTime) * 1000)
            : 0;
          setTimeout(() => {
            setPhase('listen');
            setStatusText('LISTENING');
          }, remainingAudio + 250);
        } else if (msg.type === 'citation_flag') {
          setLatestCitations((prev) => [...prev, msg]);
        }
      } catch (e) {
        console.warn('WebSocket message error:', e);
      }
    };

    socket.onerror = (err) => console.error('Hearing socket error:', err);
    socket.onclose = () => {
      setStatusText('HEARING OVER');
    };
  }, [playAudioChunk, speakJudgeVoice, finishHearing]);

  // 6. Repeat current question (voice)
  const repeatQuestion = useCallback(() => {
    if (turnAudioChunksRef.current && turnAudioChunksRef.current.length > 0) {
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        nextPlayTimeRef.current = audioCtxRef.current.currentTime;
      }
      setPhase('judge');
      setStatusText('BENCH SPEAKING');
      for (const chunk of turnAudioChunksRef.current) {
        playAudioChunk(chunk);
      }
      const remaining = audioCtxRef.current
        ? Math.max(0, (nextPlayTimeRef.current - audioCtxRef.current.currentTime) * 1000)
        : 2000;
      setTimeout(() => {
        setPhase('listen');
        setStatusText('LISTENING');
      }, remaining + 250);
    } else if (currentQRef.current) {
      speakJudgeVoice(currentQRef.current, currentWhoRef.current);
    }
  }, [playAudioChunk, speakJudgeVoice]);

  // 7. Submit counsel answer (typed fallback or speech completion)
  const submitAnswer = useCallback(async (customText) => {
    const textToSubmit = (customText !== undefined ? customText : heard).trim();
    if (!textToSubmit) return;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    turnAudioChunksRef.current = [];
    hasReceivedAudioForTurnRef.current = false;

    setPhase('think');
    setStatusText('BENCH CONFERS');

    // 1. Send text over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: textToSubmit }));
    }

    // 2. Call /api/verify to check citations mentioned in answer
    let verified = [];
    try {
      const verRes = await verifyCitations(textToSubmit);
      verified = Array.isArray(verRes) ? verRes : (verRes.citations || []);
      setLatestCitations((prev) => [...prev, ...verified]);
    } catch (err) {
      console.warn('Citation verification error:', err);
    }

    // 3. Update Q&A log
    const newEntry = {
      q: currentQRef.current || 'Anticipatory bail question',
      a: textToSubmit,
      citations: verified,
    };
    const updatedLog = [...qaLog, newEntry];
    setQaLog(updatedLog);
    setHeard('');

    // If 3 answers given, or time up, conclude
    if (updatedLog.length >= 3) {
      setTimeout(() => finishHearing(updatedLog), 2000);
    }
  }, [heard, qaLog, finishHearing]);

  // 8. Interrupt / Interject (Counsel seeks leave to clarify or interject)
  const interrupt = useCallback((customText) => {
    const textToSend = (customText || "With respect, my Lords, may Counsel address that query directly?").trim();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPhase('think');
    setStatusText('COUNSEL INTERRUPTS');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt', text: textToSend }));
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      stopMic();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [stopMic]);

  return {
    phase,
    who,
    caption,
    heard,
    recording,
    level,
    timeLeft,
    qaLog,
    latestCitations,
    scorecard,
    isEvaluating,
    statusText,
    startHearing,
    toggleMic,
    typeAnswer: setHeard,
    submitAnswer,
    repeatQuestion,
    interrupt,
    endHearing: () => finishHearing(qaLog),
  };
}
