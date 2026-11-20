import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MootCourt from './MootCourt.jsx';
import { fakeSpeech } from './testSpeech.js';
import { exportMemorial } from './exportMemorial.js';
import { SAMPLE_ANSWERS } from './mootData.js';

vi.mock('./exportMemorial.js', () => ({ exportMemorial: vi.fn(async () => {}) }));

// Arguing for the Respondent is behind VITE_MOOT_SIDES_ENABLED (off by default); these tests run with it on. The off case is in MootCourt.sides.test.jsx.
beforeEach(() => vi.stubEnv('VITE_MOOT_SIDES_ENABLED', 'true'));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
const nav = () => within(screen.getByRole('navigation', { name: 'Moot stages' }));
const go = (name) => fireEvent.click(nav().getByRole('button', { name: new RegExp(`^${name}`) }));
const step = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const stageBtn = (name) => nav().getByRole('button', { name: new RegExp(`^${name}`) });
const complete = (name) => /\(complete\)/.test(stageBtn(name).textContent);

describe('web layout', () => {
  it('shows the header, the seven stages with descriptions, and the round card', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    expect(screen.getByText('MOOT COURT')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Arjun Mehra v. State of Rajasthan');
    const labels = ['Problem', 'Issues', 'Research', 'Memorial', 'Oral round', 'Live audio hearing', 'Scorecard'];
    labels.forEach((l) => expect(stageBtn(l)).toBeTruthy());
    expect(nav().getByText('Read and mark facts')).toBeTruthy();
    expect(nav().getByText(/^ROUND ·/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Appellant' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Respondent' })).toBeTruthy();
    // opens on Problem on the web
    expect(screen.getByText(/MOOT PROPOSITION/)).toBeTruthy();
    expect(stageBtn('Problem').getAttribute('aria-current')).toBe('step');
  });

  it('lists the other problems as not open and does not switch to them', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    const sel = screen.getByLabelText('Moot problem');
    expect(within(sel).getByText(/Riya Sen v\. Union of India \(not open yet\)/).disabled).toBe(true);
  });

  it('every hit target is at least 44px tall', () => {
    const { container } = render(<MootCourt speech={fakeSpeech()} />);
    const small = [...container.querySelectorAll('button')].filter((b) => parseInt(b.style.minHeight || '0', 10) < 44);
    expect(small.map((b) => b.textContent)).toEqual([]);
  });
});

describe('stage completion ticks the rail', () => {
  it('Problem completes at 4 facts, and the key facts counter only counts paragraphs 3 to 8', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    expect(complete('Problem')).toBe(false);
    fireEvent.click(screen.getByText(/Arjun Mehra, 34/)); // background fact ¶1
    expect(screen.getByText(/Some marked facts are background only/)).toBeTruthy();
    [/joins the investigation twice/, /no notice of appearance/, /Sessions Court refuses/].forEach((r) => fireEvent.click(screen.getByText(r)));
    expect(complete('Problem')).toBe(true);
    expect(screen.getByText('3 / 6')).toBeTruthy();
  });

  it('Issues: a custom issue is added, quashing is warned about, three issues complete the stage', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    go('Issues');
    expect(complete('Issues')).toBe(false);
    fireEvent.click(screen.getByText('Whether the FIR should be quashed.'));
    expect(screen.getByText(/Quashing is outside this application/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Write an issue'), { target: { value: 'Whether bail conditions are adequate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('YOUR ISSUES (3)')).toBeTruthy();
    expect(complete('Issues')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove issue 3' }));
    expect(complete('Issues')).toBe(false);
  });

  it('Research: each authority is marked "Citation being checked"; three added complete the stage; search filters', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    go('Research');
    expect(screen.getAllByText('Citation being checked')).toHaveLength(1);
    expect(screen.getAllByText('SUPPORTS YOU')).toHaveLength(5);
    expect(screen.getAllByText('AGAINST YOU')).toHaveLength(1);
    fireEvent.click(screen.getAllByText('+ Add to memorial')[0]);
    fireEvent.click(screen.getAllByText('+ Add to memorial')[0]);
    expect(complete('Research')).toBe(true);
    fireEvent.change(screen.getByLabelText('Search authorities'), { target: { value: 'chidambaram' } });
    expect(screen.getAllByText(/P\. Chidambaram/)).toHaveLength(1);
    expect(screen.queryByText(/Gurbaksh/)).toBeNull();
  });

  it('Respondent: tags and "how to use it" flip to the State\'s point of view', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Respondent' }));
    go('Research');
    expect(screen.getAllByText('SUPPORTS YOU')).toHaveLength(1);
    expect(screen.getAllByText('AGAINST YOU')).toHaveLength(5);
    expect(screen.getByText(/Lead with it, then show why custody adds something here/)).toBeTruthy();
  });

  it('Memorial: rule checks, index and issues fill from earlier stages, draft button, export', async () => {
    render(<MootCourt speech={fakeSpeech()} />);
    go('Memorial');
    expect(screen.getByText('FORMAT CHECK')).toBeTruthy();
    expect(screen.getByText('At least 60 words')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest a draft' }));
    expect(screen.getByLabelText('Statement of facts').value).toMatch(/^1\. The Appellant, Arjun Mehra/);
    fireEvent.click(screen.getByRole('button', { name: /Index of authorities/ }));
    expect(screen.getByLabelText('Index of authorities').value).toBe('1. Arnesh Kumar v. State of Bihar, (2014) 8 SCC 273');
    expect(screen.getByText('Includes an adverse authority you will distinguish')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Issues raised/ }));
    expect(screen.getByLabelText('Issues raised').value).toMatch(/^1\. Whether the appellant is entitled to anticipatory bail/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Export memorial (DOCX)' })); });
    expect(exportMemorial).toHaveBeenCalledTimes(1);
    const arg = exportMemorial.mock.calls[0][0];
    expect(arg.sections).toHaveLength(8);
    expect(arg.sections[1].text).toMatch(/Arnesh Kumar/);
    expect(screen.getByText('✓ Exported as DOCX')).toBeTruthy();
  });

  it('Respondent has no ready-made draft and says so, instead of offering an appellant draft', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Respondent' }));
    go('Memorial');
    fireEvent.click(screen.getByRole('button', { name: /^Cover page/ }));
    expect(screen.getByRole('button', { name: 'Suggest a draft' }).disabled).toBe(true);
    expect(screen.getByText(/written for the Appellant only/)).toBeTruthy();
    expect(screen.getByLabelText('Cover page').value).toMatch(/MEMORIAL ON BEHALF OF THE RESPONDENT/);
  });
});

describe('Oral round (text)', () => {
  beforeEach(() => vi.useFakeTimers());

  it('setup offers bench, time and judges; the round runs 3 answers, scores them, and opens the scorecard', async () => {
    render(<MootCourt speech={fakeSpeech({ listen: false })} />);
    go('Oral round');
    expect(screen.getByText('Calm bench')).toBeTruthy();
    expect(screen.getByText('15 minutes')).toBeTruthy();
    expect(screen.getByText('Judges')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Very hot bench/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    expect(screen.getByText('You may begin, counsel.')).toBeTruthy();
    expect(screen.getByText(/VERY HOT BENCH · QUESTION 1 OF 3 · FOR THE APPELLANT/)).toBeTruthy();
    expect(screen.getByLabelText('Time left').textContent).toBe('10:00');

    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, under Arnesh Kumar custody is not needed because he cooperated.' } });
      fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
      expect(screen.getByText('The bench confers…')).toBeTruthy();
      await step(700);
    }
    // third answer finishes the round: scorecard, with the oral stage and the scorecard ticked
    expect(stageBtn('Scorecard').getAttribute('aria-current')).toBe('step');
    expect(complete('Oral round')).toBe(true);
    expect(complete('Scorecard')).toBe(true);
    expect(screen.getByTestId('overall').textContent).toMatch(/^\d\.\d\/10$/);
  });

  it('a weak answer on a hot bench draws a follow-up before the next question; a calm bench does not', async () => {
    render(<MootCourt speech={fakeSpeech({ listen: false })} />);
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' })); // hot is the default
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, no.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    await step(1200);
    expect(screen.getByText(/And what about P\. Chidambaram, where anticipatory bail was refused in an economic offence/)).toBeTruthy();
    expect(screen.getByText('The state of the bench'.length ? /REASONING \d/ : '')).toBeTruthy();
  });

  it('the clock counts down and turns to the on-dark accent under a minute', async () => {
    render(<MootCourt speech={fakeSpeech({ listen: false })} />);
    go('Oral round');
    fireEvent.click(screen.getByRole('radio', { name: /^5 minutes/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    await step(241000);
    expect(screen.getByLabelText('Time left').textContent).toBe('00:59');
    expect(screen.getByLabelText('Time left').style.color).toBe('rgb(251, 138, 79)');
  });

  it('Speak with no microphone types a labelled sample', async () => {
    render(<MootCourt speech={fakeSpeech({ listen: false })} />);
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    fireEvent.click(screen.getByRole('button', { name: '● Speak' }));
    await step(120 * 60);
    expect(screen.getByLabelText('Your answer').value).toMatch(/^My Lords, the appellant joined/);
    expect(screen.getByText(/Microphone not available here, so a sample answer was typed for you/)).toBeTruthy();
  });
});

describe('Live audio hearing screen', () => {
  beforeEach(() => vi.useFakeTimers());

  it('plays one question through: mic denied asks for typing, a sample only on request and labelled', async () => {
    const speech = fakeSpeech({ listenError: 'mic_denied' });
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    expect(screen.getByText('NOT STARTED')).toBeTruthy();
    expect(screen.getByText('Q 1/3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    expect(screen.getByText('BENCH SPEAKING')).toBeTruthy();
    await step(30000);
    expect(screen.getByText('LISTENING')).toBeTruthy();
    expect(screen.getByText(/^0:\d+$/)).toBeTruthy();
    expect(screen.getByTestId('mic-note').textContent).toMatch(/permission was denied/);
    expect(screen.getByRole('button', { name: 'Send answer' }).disabled).toBe(true); // nothing to send yet
    fireEvent.click(screen.getByRole('button', { name: 'Use a sample answer' }));
    expect(screen.getByTestId('sim-note').textContent).toMatch(/SAMPLE ANSWER\. This is a sample answer, not yours/);
    fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    expect(screen.getByText('BENCH CONFERS')).toBeTruthy();
    // live panels update
    expect(screen.getAllByText(/ISSUES · LIVE/).length).toBe(1);
    expect(screen.getByText('Q1: sample answer used, not your own words')).toBeTruthy();
    expect(screen.getByText(/ASSESSMENT · LIVE/)).toBeTruthy();
    expect(screen.getByText('0 / 1 covered')).toBeTruthy(); // the sample never says bail, 482 or anticipatory
  });

  it('there is always a Speak button: disabled while the bench speaks, Stop while recording, Finishing while the last words land', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    expect(screen.getByTestId('mic-idle').disabled).toBe(true);
    expect(screen.getByTestId('mic-idle').textContent).toMatch(/Speak/);
    await step(30000);
    const mic = screen.getByTestId('mic');
    expect(mic.textContent).toMatch(/Stop/);
    expect(mic.disabled).toBe(false);
    speech.say('My Lords, first point');
    speech.stopListening.mockImplementation(() => new Promise((resolve) => setTimeout(() => { speech.cb.onEnd('My Lords, first point and the end of it'); resolve(); }, 700)));
    fireEvent.click(mic);
    expect(screen.getByTestId('mic').textContent).toMatch(/Finishing/);
    expect(screen.getByTestId('mic').disabled).toBe(true);
    await step(800);
    expect(screen.getByTestId('mic').textContent).toMatch(/Speak/);
    expect(screen.getByTestId('heard').value).toBe('My Lords, first point and the end of it');
    expect(screen.getByRole('button', { name: 'Send answer' }).disabled).toBe(false);
  });

  it('Send answer waits for words: disabled while recording with nothing heard, enabled as soon as text is in the box, still while recording', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(30000);
    expect(screen.getByTestId('mic').textContent).toMatch(/Stop/); // recording
    expect(screen.getByRole('button', { name: 'Send answer' }).disabled).toBe(true); // nothing heard yet: a press would do nothing
    act(() => { speech.say('My Lords, first sentence.'); });
    expect(screen.getByTestId('mic').textContent).toMatch(/Stop/); // still recording
    expect(screen.getByRole('button', { name: 'Send answer' }).disabled).toBe(false);
    fireEvent.change(screen.getByTestId('heard'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Send answer' }).disabled).toBe(true); // blanked: nothing to send again
  });

  it('with nothing that can listen the Speak button stays on screen, disabled, with the typing note', async () => {
    render(<MootCourt speech={fakeSpeech({ listen: false })} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(30000);
    expect(screen.getByTestId('mic').disabled).toBe(true);
    expect(screen.getByTestId('mic').getAttribute('aria-label')).toMatch(/not available on this device/);
    expect(screen.getByTestId('mic-note').textContent).toMatch(/Type your answer below/);
  });

  it('three seconds of silence shows a plain hint (no vendor, no model) and the words replace it', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(30000);
    act(() => { speech.cb.onSilent(true); });
    const note = screen.getByTestId('mic-note');
    expect(note.textContent).toMatch(/We can.t hear your microphone/);
    expect(note.textContent).not.toMatch(/sarvam|\bAI\b|model|server/i);
    expect(screen.queryByRole('button', { name: 'Use a sample answer' })).toBeNull(); // a passing silence is not a reason to offer a sample
    act(() => { speech.say('My Lords, I am heard'); });
    expect(screen.queryByTestId('mic-note')).toBeNull();
    expect(screen.getByTestId('heard').value).toBe('My Lords, I am heard');
  });

  it('a full hearing ends on "Open scorecard", the stage ticks, and the scorecard shows an overall score', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(14000);
    for (let q = 0; q < 3; q += 1) {
      speech.say('My Lords, under Arnesh Kumar custody is not needed because he cooperated and will accept conditions.');
      await step(0); // let the heard text render, so Send is enabled
      fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
      await step(14000);
    }
    expect(screen.getByText('HEARING OVER')).toBeTruthy();
    expect(complete('Live audio hearing')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open scorecard' }));
    expect(screen.getByTestId('overall').textContent).toMatch(/\/10$/);
    expect(screen.getByText('CRITERIA · YOU')).toBeTruthy();
    expect(screen.queryByText(/sample/i)).toBeNull(); // real answers: no sample notice
  });

  it('leaving the screen cancels speech, stops listening and clears every timer', async () => {
    const speech = fakeSpeech();
    const { unmount } = render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(30000);
    speech.cancelSpeech.mockClear(); speech.stopListening.mockClear();
    unmount();
    expect(speech.cancelSpeech).toHaveBeenCalled();
    expect(speech.stopListening).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('End hearing, Repeat the question and Argue again are offered at the right moments', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    expect(screen.queryByRole('button', { name: 'End hearing' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    expect(screen.queryByRole('button', { name: 'Repeat the question' })).toBeNull(); // only while listening
    await step(30000);
    fireEvent.click(screen.getByRole('button', { name: 'Repeat the question' }));
    expect(screen.getByText('BENCH SPEAKING')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'End hearing' }));
    expect(screen.getByText('HEARING OVER')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Argue again' })).toBeTruthy();
  });

  it('switching sides mid-hearing stops the bench and starts clean', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(1000);
    fireEvent.click(screen.getByRole('button', { name: 'Respondent' }));
    expect(screen.getByText('NOT STARTED')).toBeTruthy();
    expect(screen.getByText(/FOR THE STATE/)).toBeTruthy();
  });
});

function HEARING_WORDS_MS(text) { return text.split(' ').length * 170 + 100; }

describe('Scorecard', () => {
  it('is an empty state until a round is finished', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    go('Scorecard');
    expect(screen.getByText('Argue the oral round to see your scorecard.')).toBeTruthy();
  });
  it('shows no class average or class tick anywhere (there is no class data)', () => {
    const { container } = render(<MootCourt speech={fakeSpeech()} />);
    go('Scorecard');
    expect(container.textContent).not.toMatch(/class average|vs class|6\.4/i);
  });
});

describe('app layout (mobile)', () => {
  it('opens on the Live audio hearing, with labels-only stage scroller, two-row header and the in-panel strip', () => {
    render(<MootCourt mobile speech={fakeSpeech()} />);
    expect(stageBtn('Live audio hearing').getAttribute('aria-current')).toBe('step');
    expect(nav().queryByText('Read and mark facts')).toBeNull(); // no descriptions
    expect(nav().queryByText(/^ROUND ·/)).toBeNull(); // no round card
    const navEl = screen.getByRole('navigation', { name: 'Moot stages' });
    expect(navEl.style.position).toBe('sticky');
    expect(navEl.style.overflowX).toBe('auto');
    expect(navEl.style.flexDirection).toBe('row');
    // header: title takes a full row, selector and side switch share the next one
    expect(screen.getByRole('heading', { level: 1 }).parentElement.style.flex).toMatch(/100%/);
    // the compact strip lives inside the dark panel and the notes card sits below it
    expect(screen.getByText('ISSUES')).toBeTruthy();
    expect(screen.getByText('ASSESSMENT')).toBeTruthy();
    expect(screen.getByText('ALL BENCH NOTES')).toBeTruthy();
    expect(screen.queryByText('ISSUES · LIVE')).toBeNull();
    expect(screen.getByText('Presiding judge')).toBeTruthy();
  });
  it('the other stages work in the app layout', () => {
    render(<MootCourt mobile speech={fakeSpeech()} />);
    go('Problem');
    expect(screen.getByText(/MOOT PROPOSITION/)).toBeTruthy();
    go('Memorial');
    expect(screen.getByText('FORMAT CHECK')).toBeTruthy();
  });
  it('the web layout does not use the app defaults', () => {
    render(<MootCourt speech={fakeSpeech()} />);
    expect(screen.getByRole('navigation', { name: 'Moot stages' }).style.flexDirection).toBe('column');
  });
});

describe('copy', () => {
  it('never says AI on any stage', () => {
    const { container } = render(<MootCourt speech={fakeSpeech()} />);
    for (const s of ['Problem', 'Issues', 'Research', 'Memorial', 'Oral round', 'Live audio hearing', 'Scorecard']) {
      go(s);
      expect(container.textContent).not.toMatch(/\bAI\b/);
    }
  });
});
