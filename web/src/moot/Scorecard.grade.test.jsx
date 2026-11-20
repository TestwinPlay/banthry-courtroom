import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MootCourt from './MootCourt.jsx';
import { fakeSpeech } from './testSpeech.js';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('VITE_CAP_MOOT', 'true'); });

const graded = {
  criteria: ['Legal reasoning', 'Use of authority', 'Answers the question', 'Structure', 'Court manner'].map((name, i) => ({ name, score: 9 - i })),
  overall: 7, tip: 'Work on court manner: offer conditions.', judgeComments: ['Bench one.', 'Bench two.', 'Bench three.'],
  perAnswer: [[5, 5, 5, 5, 5], [6, 6, 6, 6, 6], [7, 7, 7, 7, 7]],
  citations: [{ text: 'Maneka Gandhi v. Union of India', verdict: 'verified' }, { text: 'Made Up v. Nobody', verdict: 'not_found' }],
};

async function playRound(api) {
  render(<MootCourt speech={fakeSpeech({ listen: false })} api={api} />);
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Moot stages' })).getByRole('button', { name: /^Oral round/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Rise and begin' }));
  for (let i = 0; i < 3; i += 1) {
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'My Lords, custody is not needed because he cooperated.' } });
    fireEvent.click(screen.getByRole('button', { name: i === 2 ? 'Final answer' : 'Answer' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
  }
}

describe('Scorecard grading states', () => {
  it('shows the instant estimate first, then the bench assessment with judge comments and resolver verdicts', async () => {
    let resolve;
    const gradeMootHearing = vi.fn(() => new Promise((r) => { resolve = r; }));
    await playRound({ gradeMootHearing });
    expect(screen.getByText(/OVERALL · INSTANT ESTIMATE/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/being prepared/);
    const body = gradeMootHearing.mock.calls[0][0];
    expect(body).toMatchObject({ side: 'App', problemId: 'p1' });
    expect(body.transcript).toHaveLength(3);
    expect(body.transcript[0].a).toMatch(/cooperated/);
    expect(body.issues.length).toBeGreaterThan(0);

    await act(async () => { resolve(graded); });
    expect(screen.getByText(/OVERALL · BENCH ASSESSMENT/)).toBeTruthy();
    expect(screen.queryByText(/INSTANT ESTIMATE/)).toBeNull();
    expect(screen.getByTestId('overall').textContent).toBe('7.0/10');
    expect(screen.getByText('Bench two.')).toBeTruthy();
    expect(screen.getByTestId('per-answer')).toBeTruthy();
    const cites = screen.getByTestId('checked-citations');
    expect(within(cites).getByText('Found in our judgment library')).toBeTruthy();
    expect(within(cites).getByText('Not in our judgment library')).toBeTruthy();
    expect(cites.textContent).not.toMatch(/fabricat|fake|incorrect/i);
  });

  it('keeps the instant estimate and says so when the assessment fails', async () => {
    await playRound({ gradeMootHearing: vi.fn(async () => { throw new Error('503'); }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByText(/OVERALL · INSTANT ESTIMATE/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/not available right now/);
    expect(screen.queryByTestId('checked-citations')).toBeNull();
  });

  it('never names AI or a model to the student', async () => {
    await playRound({ gradeMootHearing: vi.fn(async () => graded) });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(document.body.textContent).not.toMatch(/\bAI\b|\bmodel\b|Gemini|GPT|LLM/);
  });
});
