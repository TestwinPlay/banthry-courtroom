import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MootCourt from './MootCourt.jsx';
import { fakeSpeech } from './testSpeech.js';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('VITE_CAP_MOOT', 'true'); });

const nav = () => within(screen.getByRole('navigation', { name: 'Moot stages' }));
const go = (name) => fireEvent.click(nav().getByRole('button', { name: new RegExp(`^${name}`) }));
const step = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

const MEMORIAL = `Statement of facts\n${'Arjun Mehra, aged 52, runs a payments start-up. '.repeat(8)}\n\nPrayer\nThe Appellant prays for release on bail.`;
const FINDINGS = {
  modelChecked: true,
  findings: [
    { kind: 'fact', severity: 'high', quote: 'Arjun Mehra, aged 52', problem: 'The problem says he is 34 (¶1).', fix: 'Use 34.' },
    { kind: 'authority', severity: 'medium', quote: 'Made Up v. Nobody', problem: 'Not in our judgment library. Our library holds Supreme Court judgments only, so this is a prompt to check, not a ruling on the case.', fix: 'Check the report.' },
    { kind: 'structure', severity: 'medium', quote: '', problem: 'No "Index of authorities" section found.', fix: 'Add it.' },
  ],
};
const fileOf = (name = 'memorial.docx') => new File(['x'], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
const mkApi = (over = {}) => ({ extractMootMemorial: vi.fn(async () => ({ text: MEMORIAL, truncated: false })), checkMootMemorial: vi.fn(async () => FINDINGS), gradeMootHearing: vi.fn(async () => { throw new Error('off'); }), ...over });

async function upload(api, file = fileOf()) {
  render(<MootCourt speech={fakeSpeech({ listen: false })} api={api} />);
  go('Memorial');
  fireEvent.change(screen.getByLabelText('Memorial file'), { target: { files: [file] } });
  await step(0);
}

describe('upload and check', () => {
  it('uploads, fills the sections it finds, checks, and shows findings in the rule-check style', async () => {
    const api = mkApi();
    await upload(api);
    expect(api.extractMootMemorial).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Filled 2 of 8 sections from memorial\.docx/)).toBeTruthy();
    const body = api.checkMootMemorial.mock.calls[0][0];
    expect(body).toMatchObject({ side: 'App', problemId: 'p1' });
    expect(body.problemText).toMatch(/^¶1 Arjun Mehra, 34/);
    expect(body.memorialText).toMatch(/^Statement of facts\n/);
    expect(body.memorialText).not.toMatch(/Index of authorities/); // a section the file lacked is not invented
    const list = screen.getByRole('list', { name: 'Memorial findings' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText(/FACT · SERIOUS/)).toBeTruthy();
    expect(within(list).getByText('The problem says he is 34 (¶1).')).toBeTruthy();
    expect(within(list).getByText(/Not in our judgment library/)).toBeTruthy();
    expect(list.textContent).not.toMatch(/fabricat|fake/i);
    expect(screen.getByText(/The bench will put two of these to you/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\bAI\b|\bmodel\b|Gemini|LLM/);
  });

  it('refuses a wrong file type or an oversize file before uploading', async () => {
    const api = mkApi();
    await upload(api, new File(['x'], 'm.png', { type: 'image/png' }));
    expect(screen.getByRole('alert').textContent).toMatch(/PDF and Word/);
    expect(api.extractMootMemorial).not.toHaveBeenCalled();
    const big = fileOf('big.pdf'); Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Memorial file'), { target: { files: [big] } });
    await step(0);
    expect(screen.getByRole('alert').textContent).toMatch(/20 MB/);
  });

  it('says so when the file cannot be read, and when the check cannot run', async () => {
    await upload(mkApi({ extractMootMemorial: vi.fn(async () => { throw new Error('400'); }) }));
    expect(screen.getByRole('alert').textContent).toMatch(/could not be read/);
    cleanup();
    await upload(mkApi({ checkMootMemorial: vi.fn(async () => { throw new Error('503'); }) }));
    expect(screen.getByText(/memorial check could not run right now/)).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Memorial findings' })).toBeNull();
  });

  it('puts all of an unsplittable file under Arguments advanced and says so', async () => {
    await upload(mkApi({ extractMootMemorial: vi.fn(async () => ({ text: 'A long unbroken memorial paragraph with no headings at all. '.repeat(5), truncated: false })) }));
    expect(screen.getByText(/could not find section headings in memorial\.docx/)).toBeTruthy();
    expect(screen.getByLabelText('Arguments advanced').value).toMatch(/unbroken memorial paragraph/);
  });

  it('marks findings stale after an edit and stops using them', async () => {
    await upload(mkApi());
    fireEvent.change(screen.getByLabelText(/Statement of facts|Arguments advanced|Prayer/), { target: { value: 'edited text that is different' } });
    expect(screen.getByText(/edited the memorial since this check/)).toBeTruthy();
    expect(screen.queryByText(/The bench will put/)).toBeNull();
  });

  it('shows nothing when the moot capability is off', () => {
    vi.stubEnv('VITE_CAP_MOOT', 'false');
    render(<MootCourt speech={fakeSpeech()} />);
    go('Memorial');
    expect(screen.queryByTestId('memorial-check')).toBeNull();
  });
});

describe('findings become bench questions', () => {
  it('the text round opens with the findings, max two, and is still three questions', async () => {
    const api = mkApi();
    await upload(api);
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    expect(screen.getByText('Counsel, your memorial says "Arjun Mehra, aged 52". The problem says he is 34 (¶1). Which is it?')).toBeTruthy();
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, I will correct that because the proposition governs.' } });
      fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
      await step(1300);
    }
    expect(nav().getByRole('button', { name: /^Scorecard/ }).getAttribute('aria-current')).toBe('step'); // round over after 3
    const sent = api.gradeMootHearing.mock.calls[0][0].transcript;
    expect(sent).toHaveLength(3);
    expect(sent[0].q).toMatch(/^Counsel, your memorial says/);
    expect(sent[1].q).toMatch(/^Counsel, you rely on Made Up v\. Nobody/);
  });

  it('the text round asks the second finding next, then one scripted question', async () => {
    await upload(mkApi());
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, I accept the correction.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    await step(1300);
    expect(screen.getByText(/Counsel, you rely on Made Up v\. Nobody\. Not in our judgment library\./)).toBeTruthy();
  });

  it('the live hearing speaks the first finding as its first question', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} api={mkApi()} />);
    go('Memorial');
    fireEvent.change(screen.getByLabelText('Memorial file'), { target: { files: [fileOf()] } });
    await step(0);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(100);
    expect(speech.spoken[0][0]).toMatch(/we have read your memorial\. Counsel, your memorial says "Arjun Mehra, aged 52"\./);
  });

  it('without a fresh check the scripted questions are unchanged', async () => {
    const speech = fakeSpeech();
    render(<MootCourt speech={speech} api={mkApi()} />);
    go('Live audio hearing');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin the hearing' }));
    await step(100);
    expect(speech.spoken[0][0]).not.toMatch(/your memorial says/);
  });
});
