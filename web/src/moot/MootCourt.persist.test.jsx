import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MootCourt from './MootCourt.jsx';
import { fakeSpeech } from './testSpeech.js';
import * as ds from '../../services/deviceStorage.js';
import { clearDeviceData } from '../../services/deviceStorage.js';

beforeEach(() => { localStorage.clear(); vi.stubEnv('VITE_CAP_MOOT', 'true'); vi.stubEnv('VITE_MOOT_SIDES_ENABLED', 'true'); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); localStorage.clear(); });

const nav = () => within(screen.getByRole('navigation', { name: 'Moot stages' }));
const stageBtn = (name) => nav().getByRole('button', { name: new RegExp(`^${name}`) });
const go = (name) => fireEvent.click(stageBtn(name));
const complete = (name) => /\(complete\)/.test(stageBtn(name).textContent);
const open = (props = {}) => render(<MootCourt speech={fakeSpeech({ listen: false })} userId="u1" {...props} />);
const savedKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k) => k.startsWith('bth.moot.v2.'));

describe('Moot Court keeps the work on this device', () => {
  it('after a reload the student is back on the same stage, with the facts, issues, research and memorial text they had', () => {
    const first = open();
    [/joins the investigation twice/, /no notice of appearance/, /Sessions Court refuses/, /no prior record/].forEach((r) => fireEvent.click(screen.getByText(r)));
    go('Memorial');
    fireEvent.click(screen.getByRole('button', { name: 'Suggest a draft' }));
    fireEvent.change(screen.getByLabelText('Statement of facts'), { target: { value: 'My own facts, typed by the student.' } });
    go('Issues');
    first.unmount();

    open();
    expect(stageBtn('Issues').getAttribute('aria-current')).toBe('step');
    expect(complete('Problem')).toBe(true);
    go('Memorial');
    expect(screen.getByLabelText('Statement of facts').value).toBe('My own facts, typed by the student.');
  });

  it('keeps the side the student chose', () => {
    const first = open();
    fireEvent.click(screen.getByRole('button', { name: 'Respondent' }));
    first.unmount();
    open();
    expect(screen.getByRole('button', { name: 'Respondent' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('a different student on the same device starts clean, and nothing is saved without a signed-in student', () => {
    const first = open();
    fireEvent.click(screen.getByText(/joins the investigation twice/));
    go('Issues');
    first.unmount();

    open({ userId: 'u2' });
    expect(stageBtn('Problem').getAttribute('aria-current')).toBe('step');
    cleanup();
    localStorage.clear();
    open({ userId: undefined });
    fireEvent.click(screen.getByText(/joins the investigation twice/));
    expect(savedKeys()).toEqual([]);
  });

  it('an untouched screen leaves no record, so sign-out has nothing to warn about', () => {
    open();
    expect(savedKeys()).toEqual([]);
    cleanup();
    open({ mobile: true });
    expect(savedKeys()).toEqual([]);
  });

  it('putting everything back as it was after doing something still replaces the record', () => {
    const first = open();
    go('Issues');
    expect(JSON.parse(localStorage.getItem('bth.moot.v2.u1.p1')).state.stage).toBe('issues');
    go('Problem');
    expect(JSON.parse(localStorage.getItem('bth.moot.v2.u1.p1')).state.stage).toBe('problem');
    first.unmount();
    open();
    expect(stageBtn('Problem').getAttribute('aria-current')).toBe('step');
  });

  it('sign-out clears it with the rest of the device-only study data', () => {
    open();
    go('Issues');
    expect(savedKeys().length).toBeGreaterThan(0);
    // The sign-out warning must name it (deviceStorage KINDS carries /^bth\.moot\.v2\./).
    if (ds.deviceDataSummary) expect(ds.deviceDataSummary()).toContain('Moot Court progress');
    clearDeviceData();
    expect(savedKeys()).toEqual([]);
  });

  it('a corrupt record is ignored and the screen opens as new', () => {
    localStorage.setItem('bth.moot.v2.u1.last', 'p1');
    localStorage.setItem('bth.moot.v2.u1.p1', '{not json');
    open();
    expect(stageBtn('Problem').getAttribute('aria-current')).toBe('step');
    localStorage.setItem('bth.moot.v2.u1.p1', JSON.stringify({ state: { stage: 'nope', key: 'x', issues: [{}], side: 'Both', scoreSet: { source: 'text', scores: [[99, 1, 1, 1, 1]], qa: [] } } }));
    cleanup();
    open();
    expect(stageBtn('Problem').getAttribute('aria-current')).toBe('step');
    expect(complete('Scorecard')).toBe(false);
  });

  it('a record whose memorial section, fact numbers or issue numbers do not exist opens without them and does not crash', () => {
    localStorage.setItem('bth.moot.v2.u1.last', 'p1');
    const bad = { stage: 'memorial', mem: 'zzz', key: [2, 99], issues: [0, 42], used: ['arnesh'] };
    localStorage.setItem('bth.moot.v2.u1.p1', JSON.stringify({ state: bad }));
    open();
    expect(stageBtn('Memorial').getAttribute('aria-current')).toBe('step');
    expect(screen.getByLabelText('Statement of facts')).toBeTruthy();
    go('Problem');
    expect(screen.getByText('0 / 6')).toBeTruthy(); // the bad list is dropped whole, not trusted in part
    cleanup();
    localStorage.setItem('bth.moot.v2.u1.p1', JSON.stringify({ state: { ...bad, key: [2, 3], issues: [0, 3, 'My own issue'], mem: 'prayer' } }));
    open();
    expect(screen.getByLabelText('Prayer')).toBeTruthy();
    go('Problem');
    expect(screen.getByText('2 / 6')).toBeTruthy();
    go('Issues');
    expect(screen.getByText('My own issue')).toBeTruthy();
  });

  it('a finished round comes back with its bench assessment and does not ask the bench again', async () => {
    vi.useFakeTimers();
    const graded = {
      criteria: ['Legal reasoning', 'Use of authority', 'Answers the question', 'Structure', 'Court manner'].map((name, i) => ({ name, score: 9 - i })),
      overall: 7, tip: 'Work on court manner: offer conditions.', judgeComments: ['Bench one.', 'Bench two.', 'Bench three.'],
      perAnswer: null, citations: [],
    };
    const gradeMootHearing = vi.fn(async () => graded);
    const first = open({ api: { gradeMootHearing } });
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, custody is not needed because he cooperated.' } });
      fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByText(/OVERALL · BENCH ASSESSMENT/)).toBeTruthy();
    expect(gradeMootHearing).toHaveBeenCalledTimes(1);
    first.unmount();

    const again = vi.fn(async () => graded);
    open({ api: { gradeMootHearing: again } });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(stageBtn('Scorecard').getAttribute('aria-current')).toBe('step');
    expect(screen.getByText(/OVERALL · BENCH ASSESSMENT/)).toBeTruthy();
    expect(screen.getByTestId('overall').textContent).toBe('7.0/10');
    expect(complete('Oral round')).toBe(true);
    expect(again).not.toHaveBeenCalled();
  });

  it('a round whose assessment failed comes back as failed and the bench is not asked again on every open', async () => {
    vi.useFakeTimers();
    const failing = vi.fn(async () => { throw new Error('bench down'); });
    const first = open({ api: { gradeMootHearing: failing } });
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, custody is not needed because he cooperated.' } });
      fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(failing).toHaveBeenCalledTimes(1);
    first.unmount();
    const again = vi.fn(async () => { throw new Error('bench down'); });
    open({ api: { gradeMootHearing: again } });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(stageBtn('Scorecard').getAttribute('aria-current')).toBe('step');
    expect(again).not.toHaveBeenCalled();
  });

  it('a round in progress is not resumed: the oral round opens at its setup', async () => {
    vi.useFakeTimers();
    const first = open();
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    expect(screen.getByText('You may begin, counsel.')).toBeTruthy();
    first.unmount();
    open();
    expect(stageBtn('Oral round').getAttribute('aria-current')).toBe('step');
    expect(screen.getByRole('button', { name: 'Rise and begin' })).toBeTruthy();
  });

  it('works when storage is blocked', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    open();
    fireEvent.click(screen.getByText(/joins the investigation twice/));
    expect(stageBtn('Problem').getAttribute('aria-current')).toBe('step');
    spy.mockRestore(); get.mockRestore();
  });
});
