import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEARING, MIC_NOTES, SIM_NOTES, VOICES, createHearing } from './hearingController.js';
import { QUESTIONS, SAMPLE_ANSWERS } from './mootData.js';
import { fakeSpeech } from './testSpeech.js';

let speech; let c; let states; let finished;
const make = (opts = {}, side = 'App') => {
  speech = fakeSpeech(opts);
  states = [];
  finished = null;
  c = createHearing({ speech, getSide: () => side, onChange: (s) => states.push(s), onFinish: (sc, log) => { finished = { sc, log }; } });
};
// Advance fake time in small steps until the machine reaches a phase (the clock is real in the app).
async function until(phase, max = 120000) {
  for (let t = 0; t < max && c.state.phase !== phase; t += 100) await vi.advanceTimersByTimeAsync(100);
  expect(c.state.phase).toBe(phase);
}
beforeEach(() => vi.useFakeTimers());
// Send while the microphone is on waits (a moment) for the last spoken words, so tests let that settle.
const send = async () => { c.done(); await vi.advanceTimersByTimeAsync(0); };
afterEach(() => { c?.destroy(); vi.useRealTimers(); });

describe('state machine: idle -> judge -> listen -> think -> judge ... x3 -> done', () => {
  it('starts idle with nothing running', () => {
    make();
    expect(c.state).toMatchObject({ phase: 'idle', qi: 0, log: [], sc: [] });
  });

  it('runs three questions with a spoken answer each, then finishes with three scores', async () => {
    make();
    const seen = new Set();
    c.start();
    const opening = `The court is in session. Counsel for the appellant, we have read your memorial. ${QUESTIONS.App[0]}`;
    expect(c.state).toMatchObject({ phase: 'judge', who: 'J1', lastQ: opening });
    expect(speech.spoken[0]).toEqual([opening, VOICES.J1]);

    for (let q = 0; q < 3; q += 1) {
      await until('listen');
      seen.add(`listen${q}`);
      expect(c.state.qi).toBe(q);
      expect(c.state.left).toBe(60);
      speech.say(`My Lords, under Arnesh Kumar custody adds nothing ${q}`);
      expect(c.state.heard).toMatch(/Arnesh Kumar/);
      expect(c.state.real).toBe(true);
      await send();
      expect(c.state.phase).toBe('think');
      expect(c.state.log).toHaveLength(q + 1);
      if (q < 2) await until('judge');
    }
    await until('done');
    expect(seen.size).toBe(3);
    expect(finished.sc).toHaveLength(3);
    expect(finished.log.map((l) => l.sim)).toEqual([false, false, false]);
    // order of states: every phase appeared
    expect([...new Set(states.map((s) => s.phase))]).toEqual(['judge', 'listen', 'think', 'done']);
    // the final line thanks counsel and points to the assessment
    expect(speech.spoken.at(-1)[0]).toMatch(/Thank you, counsel\. We have heard you\. Our assessment is on the screen\.$/);
  });

  it('uses each judge voice: J2 asks question 2, J1 asks question 3', async () => {
    make();
    c.start();
    await until('listen'); speech.say('My Lords, an answer'); c.done();
    await until('judge'); expect(c.state.who).toBe('J2');
    expect(speech.spoken.at(-1)[1]).toEqual({ pitch: 0.85, rate: 1.05, voice: 'J2' });
    await until('listen'); speech.say('My Lords, again'); c.done();
    await until('judge'); expect(c.state.who).toBe('J1');
    expect(speech.spoken.at(-1)[1]).toEqual({ pitch: 1, rate: 0.95, voice: 'J1' });
    expect(VOICES.J3).toEqual({ pitch: 1.15, rate: 1, voice: 'J3' });
  });

  it('the bench reacts: a weak answer draws "which judgment supports you", then the next question', async () => {
    make();
    c.start();
    await until('listen'); speech.say('My Lords, no case here'); c.done();
    await until('judge');
    expect(c.state.lastQ).toBe(`Counsel, you have not cited any authority. Which judgment supports you? ${QUESTIONS.App[1]}`);
  });

  it('captions reveal word by word, in step with the speech', async () => {
    make();
    c.start();
    await vi.advanceTimersByTimeAsync(HEARING.wordMs * 3);
    expect(c.state.cap.split(' ')).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(HEARING.wordMs);
    expect(c.state.cap.split(' ')).toHaveLength(4);
  });

  it('does not move on until the speech has finished, then waits 0.6 s', async () => {
    make();
    let finish;
    speech.speak.mockImplementation(() => new Promise((r) => { finish = r; }));
    c.start();
    await vi.advanceTimersByTimeAsync(12000); // the captions are done; the engine has not said it ended
    expect(c.state.phase).toBe('judge');
    finish();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(HEARING.afterCaptionMs - 1);
    expect(c.state.phase).toBe('judge');
    await vi.advanceTimersByTimeAsync(2);
    expect(c.state.phase).toBe('listen');
  });

  it('does not wait forever for an engine that never reports the end of speech', async () => {
    make();
    speech.speak.mockImplementation(() => new Promise(() => {}));
    c.start();
    await until('listen', 40000);
  });

  it('with no speech output it still runs on captions alone', async () => {
    make({ speak: false });
    c.start();
    await until('listen');
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('the Respondent hears the State questions', () => {
    make({}, 'Res');
    c.start();
    expect(c.state.lastQ).toBe(`The court is in session. Counsel for the State, we have read the appellant's memorial and your memorial in reply. ${QUESTIONS.Res[0]}`);
  });
});

describe('60 second answer', () => {
  it('counts down and auto-submits at zero with whatever was heard', async () => {
    make();
    c.start(); await until('listen');
    speech.say('My Lords, under Sushila Aggarwal');
    await vi.advanceTimersByTimeAsync(5000);
    expect(c.state.left).toBe(55);
    await vi.advanceTimersByTimeAsync(55000);
    expect(c.state.phase).toBe('think');
    expect(c.state.log[0]).toMatchObject({ a: 'My Lords, under Sushila Aggarwal', sim: false });
  });
  it('Done speaking before the clock stops the clock', async () => {
    make();
    c.start(); await until('listen');
    speech.say('My Lords, short answer');
    c.done();
    await vi.advanceTimersByTimeAsync(5000);
    expect(c.state.log).toHaveLength(1);
    expect(c.state.left).toBeGreaterThan(0); // the old countdown is gone; the next one has not run out
  });
});

describe('the answer box: speech fills it, typing works, nothing is invented', () => {
  it('microphone denied: the box waits for typing and says why; no sample is filled in', async () => {
    make({ listenError: 'mic_denied' });
    c.start(); await until('listen');
    await vi.advanceTimersByTimeAsync(5000);
    expect(c.state).toMatchObject({ heard: '', micIssue: 'mic_denied', sample: false });
    expect(MIC_NOTES.mic_denied).toMatch(/permission was denied/);
  });
  it('no recogniser on this device: typing only, listen never called', async () => {
    make({ listen: false });
    c.start(); await until('listen');
    expect(speech.listen).not.toHaveBeenCalled();
    expect(c.state.micIssue).toBe('default');
  });
  it('silence never submits or fills in an answer for the student', async () => {
    make();
    c.start(); await until('listen');
    await vi.advanceTimersByTimeAsync(10000);
    expect(c.state).toMatchObject({ phase: 'listen', heard: '', sample: false });
  });
  it('Send with an empty box does nothing; typed text is sent as the student\'s own answer', async () => {
    make();
    c.start(); await until('listen');
    c.done();
    expect(c.state.phase).toBe('listen');
    c.type('My Lords, the appellant joined the investigation twice');
    expect(c.state).toMatchObject({ typing: true, real: true });
    expect(speech.stopListening).toHaveBeenCalled();
    speech.say('stray recogniser words'); // a late partial must not overwrite typed text
    expect(c.state.heard).toBe('My Lords, the appellant joined the investigation twice');
    c.done();
    expect(c.state.log[0]).toMatchObject({ a: 'My Lords, the appellant joined the investigation twice', sim: false });
  });
  it('a sample answer only appears on request, labelled, and is logged as a sample', async () => {
    make({ listenError: 'mic_denied' });
    c.start(); await until('listen');
    c.useSample();
    expect(c.state).toMatchObject({ heard: SAMPLE_ANSWERS.App[0], sample: true, simReason: 'sample' });
    expect(SIM_NOTES.sample).toMatch(/sample answer, not yours/);
    c.done();
    expect(c.state.log[0]).toMatchObject({ a: SAMPLE_ANSWERS.App[0], sim: true });
  });
  it('the clock running out submits whatever is in the box, or records no answer', async () => {
    make();
    c.start(); await until('listen');
    await vi.advanceTimersByTimeAsync(HEARING.answerSeconds * 1000 + 50);
    expect(c.state.log[0]).toMatchObject({ a: '(No answer given)', sim: false });
  });
  it('Mic button stops recording and keeps the words; pressing again adds to them', async () => {
    make();
    c.start(); await until('listen');
    expect(c.state.recording).toBe(true);
    speech.say('My Lords, first point');
    c.toggleMic();
    expect(c.state).toMatchObject({ recording: false, heard: 'My Lords, first point' });
    expect(speech.stopListening).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0); // the stop settles
    expect(c.state).toMatchObject({ stopping: false, typing: true });
    c.toggleMic();
    expect(c.state.recording).toBe(true);
    speech.say('and the second');
    expect(c.state.heard).toBe('My Lords, first point and the second');
  });
  it('a recogniser that stops on its own is restarted and the words are kept', async () => {
    make();
    c.start(); await until('listen');
    speech.say('My Lords, first point');
    speech.cb.onEnd('My Lords, first point');
    await vi.advanceTimersByTimeAsync(0);
    expect(speech.listenCalls).toBe(2);
    speech.say('and the second');
    expect(c.state.heard).toBe('My Lords, first point and the second');
  });
});

describe('controls', () => {
  it('Repeat the question speaks the same line again and listens again', async () => {
    make();
    c.start(); await until('listen');
    const line = c.state.lastQ;
    c.repeat();
    expect(c.state.phase).toBe('judge');
    expect(speech.spoken.at(-1)[0]).toBe(line);
    await until('listen');
  });
  it('End hearing stops speech and listening, goes to done and reports what was scored', async () => {
    make();
    c.start(); await until('listen');
    speech.say('My Lords, under Arnesh Kumar'); await send();
    c.end();
    expect(c.state.phase).toBe('done');
    expect(speech.cancelSpeech).toHaveBeenCalled();
    expect(speech.stopListening).toHaveBeenCalled();
    expect(finished.sc).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(20000);
    expect(c.state.phase).toBe('done'); // nothing resumes
  });
  it('Argue again starts clean', async () => {
    make();
    c.start(); await until('listen'); speech.say('My Lords'); c.done(); c.end();
    c.start();
    expect(c.state).toMatchObject({ phase: 'judge', log: [], sc: [], qi: 0 });
  });
  it('reset returns to idle', async () => {
    make();
    c.start(); await until('listen'); c.reset();
    expect(c.state.phase).toBe('idle');
  });
});

describe('cleanup on leave', () => {
  it('destroy cancels speech, stops the recogniser and clears every timer; no state is published after', async () => {
    make();
    c.start(); await until('listen');
    speech.cancelSpeech.mockClear(); speech.stopListening.mockClear();
    const n = states.length;
    c.destroy();
    expect(speech.cancelSpeech).toHaveBeenCalled();
    expect(speech.stopListening).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(90000);
    expect(states.length).toBe(n);
  });
  it('late recogniser results after leaving are ignored', async () => {
    make();
    c.start(); await until('listen');
    const cb = speech.cb; c.destroy();
    cb.onPartial('too late');
    expect(c.state.heard).not.toBe('too late');
  });
});

describe('stopping the microphone does not lose the last words', () => {
  // Like the server-assisted engine: the final text is delivered a moment AFTER stopListening(), through onEnd.
  const lateFinal = (text, ms = 800) => {
    speech.stopListening.mockImplementation(() => new Promise((resolve) => setTimeout(() => { speech.cb.onEnd(text); resolve(); }, ms)));
  };
  it('Stop: words that arrive after the press reach the box, then the box is the student\'s to edit', async () => {
    make(); c.start(); await until('listen');
    speech.say('My Lords, first');
    lateFinal('My Lords, first and the last words');
    c.toggleMic();
    expect(c.state).toMatchObject({ recording: false, stopping: true });
    await vi.advanceTimersByTimeAsync(900);
    expect(c.state).toMatchObject({ stopping: false, typing: true, heard: 'My Lords, first and the last words' });
    expect(speech.listenCalls).toBe(1); // finishing a stop never starts listening again
  });
  it('Send while recording waits for the last words and sends them', async () => {
    make(); c.start(); await until('listen');
    speech.say('My Lords, under Arnesh Kumar');
    lateFinal('My Lords, under Arnesh Kumar custody adds nothing');
    c.done();
    expect(c.state).toMatchObject({ phase: 'listen', stopping: true });
    c.done(); // a second press changes nothing
    await vi.advanceTimersByTimeAsync(900);
    expect(c.state.phase).toBe('think');
    expect(c.state.log).toHaveLength(1);
    expect(c.state.log[0].a).toBe('My Lords, under Arnesh Kumar custody adds nothing');
  });
  it('the clock running out also takes the last words', async () => {
    make(); c.start(); await until('listen');
    speech.say('My Lords, under Sushila Aggarwal');
    lateFinal('My Lords, under Sushila Aggarwal the court may not rewrite the statute');
    await vi.advanceTimersByTimeAsync(HEARING.answerSeconds * 1000 + 900);
    expect(c.state.log[0].a).toBe('My Lords, under Sushila Aggarwal the court may not rewrite the statute');
  });
  it('a stop that never answers cannot hang Send: it waits at most stopMs, then sends what is in the box', async () => {
    make(); c.start(); await until('listen');
    speech.say('My Lords, a short answer');
    speech.stopListening.mockImplementation(() => new Promise(() => {}));
    c.done();
    await vi.advanceTimersByTimeAsync(HEARING.stopMs - 100);
    expect(c.state.phase).toBe('listen');
    await vi.advanceTimersByTimeAsync(200);
    expect(c.state.phase).toBe('think');
    expect(c.state.log[0].a).toBe('My Lords, a short answer');
  });
  it('the clock running out while Send is still finishing a stop takes the answer when the stop ends', async () => {
    make(); c.start(); await until('listen');
    await vi.advanceTimersByTimeAsync((HEARING.answerSeconds - 2) * 1000); // 2 s left
    expect(c.state.left).toBe(2);
    // Send with nothing heard yet; the engine needs 3 s (< stopMs) to finish, so the clock reaches 0 first.
    speech.stopListening.mockImplementation(() => new Promise((resolve) => setTimeout(() => { speech.cb.onEnd('My Lords, the last words'); resolve(); }, 3000)));
    c.done();
    expect(c.state).toMatchObject({ phase: 'listen', stopping: true });
    await vi.advanceTimersByTimeAsync(2100);
    expect(c.state).toMatchObject({ phase: 'listen', left: 0 }); // the clock is out, the stop is still finishing
    await vi.advanceTimersByTimeAsync(1000);
    expect(c.state.phase).toBe('think'); // used to stay at 0 s in "listen" with nothing happening
    expect(c.state.log[0].a).toBe('My Lords, the last words');
  });
  it('the same with nothing heard at all records no answer instead of hanging at 0 s', async () => {
    make(); c.start(); await until('listen');
    await vi.advanceTimersByTimeAsync((HEARING.answerSeconds - 1) * 1000);
    speech.stopListening.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 2500)));
    c.done();
    await vi.advanceTimersByTimeAsync(3000);
    expect(c.state.phase).toBe('think');
    expect(c.state.log[0].a).toBe('(No answer given)');
  });
  it('a Send before the clock runs out with nothing heard still just stops the microphone', async () => {
    make(); c.start(); await until('listen');
    speech.stopListening.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500)));
    c.done();
    await vi.advanceTimersByTimeAsync(600);
    expect(c.state).toMatchObject({ phase: 'listen', stopping: false });
    expect(c.state.left).toBeGreaterThan(0);
  });
  it('typing right after Stop wins over text that arrives later', async () => {
    make(); c.start(); await until('listen');
    speech.say('My Lords, first');
    lateFinal('My Lords, first and more');
    c.toggleMic();
    c.type('My Lords, I would rather type this');
    await vi.advanceTimersByTimeAsync(900);
    expect(c.state).toMatchObject({ heard: 'My Lords, I would rather type this', typing: true, stopping: false });
  });
  it('Send with nothing heard stops the microphone and does not submit an empty answer', async () => {
    make(); c.start(); await until('listen');
    await send();
    expect(c.state).toMatchObject({ phase: 'listen', recording: false, stopping: false });
    expect(c.state.log).toHaveLength(0);
  });
  it('the Speak button is ignored while a stop is finishing', async () => {
    make(); c.start(); await until('listen');
    lateFinal('x');
    c.toggleMic(); c.toggleMic();
    expect(speech.listenCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(900);
  });
});

describe('microphone feedback', () => {
  it('shows the level, and a plain "can\'t hear your microphone" hint that clears when sound or words arrive', async () => {
    make(); c.start(); await until('listen');
    speech.cb.onLevel(2);
    expect(c.state.level).toBe(2);
    speech.cb.onSilent(true);
    expect(c.state.micIssue).toBe('silent');
    expect(MIC_NOTES.silent).toMatch(/can.t hear your microphone/);
    expect(MIC_NOTES.silent).not.toMatch(/sarvam|\bAI\b|model|server/i);
    speech.cb.onSilent(false);
    expect(c.state.micIssue).toBeNull();
    speech.cb.onSilent(true);
    speech.say('My Lords');
    expect(c.state.micIssue).toBeNull(); // words arrived: the hint goes
    speech.cb.onSilent(true);
    expect(c.state.micIssue).toBeNull(); // and does not come back over words
  });
  it('never replaces a different microphone problem or text the student typed', async () => {
    make(); c.start(); await until('listen');
    c.type('My Lords, typed');
    speech.cb.onSilent(true);
    expect(c.state.micIssue).toBeNull();
  });
  it('a recogniser that ends with no restarts left shows the Speak button again, not a stuck Stop', async () => {
    make(); c.start(); await until('listen');
    for (let i = 0; i <= HEARING.restarts; i += 1) speech.cb.onEnd(`part ${i}`);
    expect(c.state.recording).toBe(false);
    expect(c.state.heard).toBe('part 0 part 1 part 2 part 3 part 4');
  });
});
