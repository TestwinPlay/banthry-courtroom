// A scriptable device speech object for tests: records what was spoken, lets a test feed what the student "says".
import { vi } from 'vitest';

export function fakeSpeech({ listen = true, speak = true, listenError = null } = {}) {
  const f = {
    support: { via: 'browser', listen, speak, canCapture: true },
    spoken: [], cb: null, listenCalls: 0,
    cancelSpeech: vi.fn(), stopListening: vi.fn(),
    speak: vi.fn(async (t, o) => { f.spoken.push([t, o]); }),
    listen: vi.fn(async (cb) => { f.cb = cb; f.listenCalls += 1; if (listenError) cb.onError(listenError); }),
    say(text) { f.cb?.onPartial(text); },
  };
  return f;
}
