// Arguing for the Respondent: the VITE_MOOT_SIDES_ENABLED switch (off by default), the Respondent's issues, research,
// memorial guidance, bench questions, the grading request and the saved side.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MootCourt from './MootCourt.jsx';
import { fakeSpeech } from './testSpeech.js';
import { QUESTIONS, SUGGESTED_ISSUES, SUGGESTED_ISSUES_RES, MEMORIAL_GUIDE_RES } from './mootData.js';
import { AUTHORITIES } from './mootAuthorities.js';

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.stubEnv('VITE_CAP_MOOT', 'true'); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); localStorage.clear(); });

const go = (name) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Moot stages' })).getByRole('button', { name: new RegExp(`^${name}`) }));
const open = (props = {}) => render(<MootCourt speech={fakeSpeech({ listen: false })} userId="u1" {...props} />);
const savedRecord = () => JSON.parse(localStorage.getItem('bth.moot.v2.u1.p1'));
async function playRound() {
  go('Oral round');
  fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
  for (let i = 0; i < 3; i += 1) {
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, custody is needed because the amount is large.' } });
    fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
  }
}

describe('switch off (the default)', () => {
  it('has no side control, no switch-sides button, and a saved Respondent record is shown as the Appellant and kept', async () => {
    localStorage.setItem('bth.moot.v2.u1.p1', JSON.stringify({ v: 1, state: { side: 'Res', stage: 'issues', key: [], issues: [0], used: ['arnesh'] }, grade: null }));
    localStorage.setItem('bth.moot.v2.u1.last', 'p1');
    open();
    expect(screen.queryByRole('group', { name: 'Your side' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Respondent' })).toBeNull();
    expect(screen.getByText(SUGGESTED_ISSUES[1])).toBeTruthy(); // Appellant wording
    expect(screen.queryByText(SUGGESTED_ISSUES_RES[1])).toBeNull();
    fireEvent.click(screen.getByText(SUGGESTED_ISSUES[2])); // a change forces a save
    expect(savedRecord().state.side).toBe('Res'); // not overwritten
    go('Memorial');
    expect(screen.queryByTestId('res-guide')).toBeNull();
    await playRound();
    expect(screen.getByTestId('overall')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Switch sides and argue' })).toBeNull();
  });

  it('does not show a saved Respondent round as the Appellant\'s, and a round argued while off makes the record the Appellant\'s', async () => {
    const scoreSet = { source: 'text', scores: [[6, 6, 6, 6, 6]], qa: [{ q: 'Q', a: 'Respondent answer' }] };
    localStorage.setItem('bth.moot.v2.u1.p1', JSON.stringify({ v: 1, state: { side: 'Res', stage: 'score', oralDone: true, scoreSet }, grade: null, gradeFailed: true }));
    localStorage.setItem('bth.moot.v2.u1.last', 'p1');
    const gradeMootHearing = vi.fn(async () => null);
    open({ api: { gradeMootHearing } });
    expect(screen.queryByTestId('overall')).toBeNull(); // the Respondent's scorecard is not shown as the Appellant's
    expect(gradeMootHearing).not.toHaveBeenCalled(); // nor graded again as the Appellant
    await playRound();
    expect(gradeMootHearing.mock.calls[0][0].side).toBe('App');
    expect(savedRecord().state.side).toBe('App');
  });

  it('asks the bench with side App even when a Respondent record is saved', async () => {
    localStorage.setItem('bth.moot.v2.u1.p1', JSON.stringify({ v: 1, state: { side: 'Res', stage: 'oral' }, grade: null }));
    localStorage.setItem('bth.moot.v2.u1.last', 'p1');
    const gradeMootHearing = vi.fn(async () => null);
    open({ api: { gradeMootHearing } });
    await playRound();
    expect(gradeMootHearing.mock.calls[0][0].side).toBe('App');
  });
});

describe('switch on', () => {
  beforeEach(() => vi.stubEnv('VITE_MOOT_SIDES_ENABLED', 'true'));
  const asRespondent = () => fireEvent.click(screen.getByRole('button', { name: 'Respondent' }));

  it('switches sides from the header', () => {
    open();
    expect(screen.getByRole('button', { name: 'Appellant' }).getAttribute('aria-pressed')).toBe('true');
    asRespondent();
    expect(screen.getByRole('button', { name: 'Respondent' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('frames issues, research and memorial for the State, opposing anticipatory bail', () => {
    open();
    asRespondent();
    go('Issues');
    expect(screen.getByText(/You oppose the grant of anticipatory bail/)).toBeTruthy();
    SUGGESTED_ISSUES_RES.slice(1, 4).forEach((t) => expect(screen.getByText(t)).toBeTruthy());
    expect(screen.queryByText(SUGGESTED_ISSUES[1])).toBeNull();
    go('Research');
    expect(screen.getByText(/As the State you will meet the appellant/)).toBeTruthy();
    go('Memorial');
    expect(screen.getByTestId('res-guide').textContent).toContain(MEMORIAL_GUIDE_RES.facts);
    fireEvent.click(screen.getByRole('button', { name: /^Arguments advanced/ }));
    expect(screen.getByTestId('res-guide').textContent).toContain('Answer the appellant issue by issue');
    fireEvent.click(screen.getByRole('button', { name: /^Prayer/ }));
    expect(screen.getByTestId('res-guide').textContent).toContain('reject the application');
  });

  it('the Appellant memorial has no Respondent guidance', () => {
    open();
    go('Memorial');
    expect(screen.queryByTestId('res-guide')).toBeNull();
  });

  it('research authorities are only the ones already in the verified list, with their verified flags', () => {
    open();
    asRespondent();
    go('Research');
    AUTHORITIES.forEach((a) => expect(screen.getByText(a.name)).toBeTruthy());
    expect(screen.getAllByText('Citation being checked').length).toBe(AUTHORITIES.filter((a) => !a.verified).length);
  });

  it('the Respondent hears the State questions in the text round, and the grading request carries side Res and the State issues', async () => {
    const gradeMootHearing = vi.fn(async () => null);
    open({ api: { gradeMootHearing } });
    asRespondent();
    go('Issues');
    fireEvent.click(screen.getByText(SUGGESTED_ISSUES_RES[2]));
    go('Oral round');
    fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
    expect(screen.getByText(QUESTIONS.Res[0])).toBeTruthy();
    for (let i = 0; i < 3; i += 1) {
      fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, custody is needed because the amount is large.' } });
      fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
      await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    }
    const body = gradeMootHearing.mock.calls[0][0];
    expect(body.side).toBe('Res');
    expect(body.problemId).toBe('p1');
    expect(body.transcript).toHaveLength(3);
    expect(body.issues).toContain(SUGGESTED_ISSUES_RES[2]);
    expect(body.issues).not.toContain(SUGGESTED_ISSUES[1]);
  });

  it('"Switch sides and argue" on the scorecard flips the side, clears the round and opens the oral round', async () => {
    open();
    asRespondent();
    await playRound();
    fireEvent.click(screen.getByRole('button', { name: 'Switch sides and argue' }));
    expect(screen.getByRole('button', { name: 'Appellant' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Oral round' })).toBeTruthy();
    expect(savedRecord().state.side).toBe('App');
    expect(savedRecord().state.scoreSet).toBeNull();
  });

  it('keeps the Respondent side and issues across a reload', () => {
    const first = open();
    asRespondent();
    go('Issues');
    first.unmount();
    open();
    expect(screen.getByRole('button', { name: 'Respondent' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(SUGGESTED_ISSUES_RES[1])).toBeTruthy();
  });
});
