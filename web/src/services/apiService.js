// Client API service for Banthry Courtroom
export async function getCase(prompt) {
  const res = await fetch('/api/case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('Failed to fetch case proposition');
  return res.json();
}

export async function generateCaseFromJudgment({ file, text, topic }) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (text) formData.append('source_text', text);
  if (topic) formData.append('target_topic', topic);

  const res = await fetch('/api/cases/from-judgment', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate moot problem from judgment');
  }
  return res.json();
}

export async function verifyCitations(text) {
  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to verify citations');
  return res.json();
}

export async function evaluateHearing(payload) {
  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to evaluate hearing');
  return res.json();
}

export async function getExhibitImage(prompt) {
  const res = await fetch('/api/exhibit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('Failed to generate exhibit');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export default {
  getCase,
  verifyCitations,
  evaluateHearing,
  getExhibitImage,
};
