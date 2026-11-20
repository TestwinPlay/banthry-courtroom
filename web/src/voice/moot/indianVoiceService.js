/**
 * Indian Legal Voice & Speech Synthesis Service for Banthry Courtroom
 * - Expands Indian legal acronyms (BNS, BNSS, BSA, CrPC, IPC, FIR, IO, ss.) into authentic phonetics
 * - Resolves native Indian English voices (Rishi, Veena, Google en-IN, Microsoft Neerja/Prabhat)
 * - Eliminates robotic pitch distortions and provides authentic Indian appellate bench cadence.
 */

let cachedVoices = [];

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const v = window.speechSynthesis.getVoices() || [];
  if (v.length > 0) {
    cachedVoices = v;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

/**
 * Phonetically expands Indian legal citations, sections, and statutes so the TTS engine
 * pronounces them naturally as an Indian High Court judge would, rather than as garbled acronyms.
 */
export function phonetizeLegalText(rawText) {
  if (!rawText) return '';
  let s = String(rawText);

  // Remove speaker prefixes like [J1], [J2], [J3], [OC], [ADV], [CLERK]
  s = s.replace(/^\[(J1|J2|J3|OC|ADV|W|CLERK)\]\s*:?/i, '');

  // Clean quotation marks at edges if any
  s = s.replace(/^["“]|["”]$/g, '').trim();

  // Statutes
  s = s.replace(/\bBNSS\b/g, 'B N S S');
  s = s.replace(/\bBNS\b/g, 'B N S');
  s = s.replace(/\bBSA\b/g, 'B S A');
  s = s.replace(/\bCrPC\b/g, 'C r P C');
  s = s.replace(/\bIPC\b/g, 'I P C');
  s = s.replace(/\bFIR\b/g, 'F I R');
  s = s.replace(/\bIO\b/g, 'I O');
  s = s.replace(/\bNBW\b/g, 'N B W');
  s = s.replace(/\bSC\b/g, 'Supreme Court');
  s = s.replace(/\bHC\b/g, 'High Court');
  s = s.replace(/\bPP\b/g, 'Public Prosecutor');
  s = s.replace(/\bLLP\b/g, 'L L P');
  s = s.replace(/\bPvt\.\s*Ltd\b/gi, 'Private Limited');

  // Sections & Exhibits
  s = s.replace(/\bss\.\s*(\d+[A-Za-z]?(?:\(\d+\))*)/gi, 'Sections $1');
  s = s.replace(/\bs\.\s*(\d+[A-Za-z]?(?:\(\d+\))*)/gi, 'Section $1');
  s = s.replace(/\bsec\.\s*(\d+)/gi, 'Section $1');
  s = s.replace(/¶\s*(\d+)/g, 'Paragraph $1');
  s = s.replace(/\bpara\s*(\d+)/gi, 'Paragraph $1');
  s = s.replace(/\bEx\.\s*([A-Za-z0-9\-]+)/g, 'Exhibit $1');
  s = s.replace(/\bvs?\.\b/gi, 'versus');

  // Indian Currency Formatting (Rupees, Crore, Lakh)
  s = s.replace(/₹\s*([0-9,.]+)\s*crores?/gi, 'Rupees $1 crore');
  s = s.replace(/₹\s*([0-9,.]+)\s*lakhs?/gi, 'Rupees $1 lakh');
  s = s.replace(/₹\s*([0-9,.]+)/g, 'Rupees $1');

  // Subsection expansions e.g. (3) -> subsection 3
  s = s.replace(/Section\s+(\d+[A-Za-z]?)\s*\((\d+)\)/gi, 'Section $1 subsection $2');
  s = s.replace(/\((\d+)\)/g, ' subsection $1 ');

  return s;
}

/**
 * Finds the optimal authentic Indian English voice for the given judge or counsel role.
 */
export function getIndianVoice(judgeCode = 'J1') {
  const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  if (!voices || voices.length === 0) return null;

  // Filter Indian English voices (en-IN)
  const indianVoices = voices.filter((v) => {
    const l = (v.lang || '').replace('_', '-').toLowerCase();
    const n = (v.name || '').toLowerCase();
    return l.includes('en-in') || l.includes('hi-in') || n.includes('india') || n.includes('indian');
  });

  // Check specific named voices on macOS / Windows / Android
  const rishi = voices.find((v) => v.name.toLowerCase().includes('rishi'));
  const veena = voices.find((v) => v.name.toLowerCase().includes('veena'));
  const googleIN = voices.find(
    (v) => (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('english')) && (v.lang.includes('IN') || v.name.includes('India'))
  );
  const msNeerja = voices.find((v) => v.name.toLowerCase().includes('neerja'));
  const msPrabhat = voices.find((v) => v.name.toLowerCase().includes('prabhat'));

  // Role-specific voice routing
  if (judgeCode === 'J1') {
    // Presiding Judge: deep authoritative Indian male baritone
    return rishi || msPrabhat || indianVoices[0] || googleIN || getFallbackVoice(voices);
  } else if (judgeCode === 'J2') {
    // Senior Puisne Judge: sharp Indian female / distinctive judge tone
    return veena || msNeerja || indianVoices[1] || indianVoices[0] || getFallbackVoice(voices);
  } else if (judgeCode === 'J3') {
    // Junior Puisne Judge: articulate, crisp Indian tone
    return googleIN || msPrabhat || indianVoices[2] || indianVoices[0] || getFallbackVoice(voices);
  } else {
    // Opposing Counsel (Learned PP)
    return indianVoices[1] || indianVoices[0] || getFallbackVoice(voices);
  }
}

function getFallbackVoice(voices) {
  // If no en-IN voice is on system, use natural en-GB voice rather than robotic defaults
  return (
    voices.find((v) => (v.lang || '').toLowerCase().includes('en-gb')) ||
    voices.find((v) => (v.lang || '').toLowerCase().startsWith('en')) ||
    voices[0]
  );
}

/**
 * Synthesizes judge speech with natural Indian High Court cadence and phonetics.
 */
export function speakJudgeAudio(text, judgeCode = 'J1', { onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  try {
    window.speechSynthesis.cancel();

    const spokenText = phonetizeLegalText(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = getIndianVoice(judgeCode);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-IN';
    }

    // Authentic Indian High Court judicial cadence (no pitch distortion)
    if (judgeCode === 'J1') {
      utterance.pitch = 1.0; // Steady natural pitch
      utterance.rate = 0.94;  // Authoritative judicial deliberation
    } else if (judgeCode === 'J2') {
      utterance.pitch = 1.0;
      utterance.rate = 0.98;
    } else if (judgeCode === 'J3') {
      utterance.pitch = 1.02;
      utterance.rate = 1.0;
    } else {
      utterance.pitch = 0.98;
      utterance.rate = 1.02;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis event:', e);
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (err) {
    console.warn('Failed to speak judge audio:', err);
    if (onError) onError(err);
    return null;
  }
}

export function cancelJudgeAudio() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
