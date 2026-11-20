const API_BASE = '/api';

export async function fetchCases() {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error('Failed to load moot cases');
  return res.json();
}

export async function fetchCase(caseId) {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error('Failed to load case details');
  return res.json();
}

export async function fetchRubrics() {
  const res = await fetch(`${API_BASE}/rubrics`);
  if (!res.ok) throw new Error('Failed to load rubric');
  return res.json();
}

export async function createSession(payload) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to initialize courtroom session');
  return res.json();
}

export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function fetchTranscripts(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/transcripts`);
  if (!res.ok) throw new Error('Failed to fetch transcripts');
  return res.json();
}

export async function fetchObjections(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/objections`);
  if (!res.ok) throw new Error('Failed to fetch objections');
  return res.json();
}

export async function evaluateSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/evaluate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate scorecard');
  return res.json();
}

export async function fetchScorecard(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/scorecard`);
  if (!res.ok) throw new Error('Failed to fetch scorecard');
  return res.json();
}

export async function verifyCitation(citation, context = '') {
  const res = await fetch(`${API_BASE}/citations/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citation, context }),
  });
  if (!res.ok) throw new Error('Failed to verify citation');
  return res.json();
}
