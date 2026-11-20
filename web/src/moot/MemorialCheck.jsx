// Memorial stage: upload an existing memorial (PDF/DOCX) and check it for errors. Findings use the ink/clay rule-check
// style of the format checks above. The top findings are put to the student as bench questions in the oral round and the
// live hearing (see benchProbes). Nothing here names how the check is made.
import React, { useRef, useState } from 'react';
import apiService from '../../services/apiService';
import { MEMORIAL_SECTIONS } from './mootData.js';
import { benchProbes, checksOnline, composeMemorial, fileProblem, kindLabel, MIN_CHECK_CHARS, runMemorialCheck, splitUploaded } from './memorialCheck.js';
import { CLAY, CLAY_DEEP, INK, LINE_SOFT, MUTED, SUB, WHITE, ghost, mono } from './ui.js';

const SEV_LABEL = { high: 'SERIOUS', medium: 'CHECK', low: 'MINOR' };

export default function MemorialCheck({ st, up, api = apiService }) {
  const input = useRef(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  if (!checksOnline()) return null;

  const check = st.check;
  const current = composeMemorial(st);
  const stale = check?.status === 'done' && check.text !== current;
  const probes = check?.status === 'done' && !stale ? benchProbes(check.findings) : [];

  const run = async (state) => {
    const text = composeMemorial(state);
    if (text.length < MIN_CHECK_CHARS) { setErr('Write or upload more of the memorial before checking it.'); return; }
    setErr(''); setBusy('check'); up({ check: { status: 'checking', findings: [], text } });
    const r = await runMemorialCheck({ api, side: state.side, problemId: state.prob, memorial: text });
    setBusy('');
    up({ check: r ? { status: 'done', findings: r.findings, modelChecked: r.modelChecked, text } : { status: 'failed', findings: [], text } });
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const bad = fileProblem(file);
    if (bad) { setErr(bad); return; }
    setErr(''); setNote(''); setBusy('upload');
    try {
      const { text, truncated } = await api.extractMootMemorial(file);
      const found = splitUploaded(text);
      const memT = Object.fromEntries(MEMORIAL_SECTIONS.map(([k]) => [k, found[k] || '']));
      const n = Object.keys(found).length;
      if (!n) memT.args = text; // no headings recognised: keep everything, in the arguments
      const next = { ...st, memT: { ...st.memT, ...memT }, exported: false };
      up({ memT: next.memT, exported: false, mem: n ? st.mem : 'args' });
      setNote(n
        ? `Filled ${n} of 8 sections from ${file.name}. Sections not found in the file are empty: read each one and fix where the file did not split cleanly.`
        : `We could not find section headings in ${file.name}, so all of it is in Arguments advanced. Move each part to its section.`);
      if (truncated) setNote((t) => `${t} The file was long, so only the first part was read.`);
      setBusy('');
      await run(next);
    } catch {
      setBusy('');
      setErr('The file could not be read. Try a text-based PDF or a .docx, or write the memorial here.');
    }
  };

  return (
    <div data-testid="memorial-check" style={{ borderTop: `1px solid ${LINE_SOFT}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={mono(10, MUTED)}>YOUR OWN MEMORIAL</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" disabled={!!busy} onClick={() => input.current?.click()} style={ghost({ opacity: busy ? 0.55 : 1 })}>{busy === 'upload' ? 'Reading the file…' : 'Upload your memorial'}</button>
        <input ref={input} type="file" aria-label="Memorial file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFile} style={{ display: 'none' }} />
        <button type="button" disabled={!!busy} onClick={() => run(st)} style={ghost({ opacity: busy ? 0.55 : 1 })}>{busy === 'check' || check?.status === 'checking' ? 'Checking…' : 'Check my memorial'}</button>
        <span style={{ fontSize: 12, color: MUTED }}>PDF or Word, up to 20 MB, as an alternative to writing it here.</span>
      </div>
      {note && <div role="status" style={{ fontSize: 13, color: SUB }}>{note}</div>}
      {err && <div role="alert" style={{ fontSize: 13, color: CLAY_DEEP }}>{err}</div>}
      {check?.status === 'failed' && <div role="status" style={{ fontSize: 13, color: SUB }}>The memorial check could not run right now. The format checks above still apply.</div>}
      {stale && <div role="status" style={{ fontSize: 13, color: SUB }}>You have edited the memorial since this check. Check it again.</div>}
      {check?.status === 'done' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{check.findings.length ? `${check.findings.length} thing${check.findings.length === 1 ? '' : 's'} to look at` : 'Nothing found in this check'}</div>
          {!check.modelChecked && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Facts and forum were checked by rule only this time.</div>}
          <ul aria-label="Memorial findings" style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
            {check.findings.map((f, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 999, background: CLAY, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, marginTop: 2 }}>!</span>
                <span style={{ minWidth: 0 }}>
                  <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>To fix: </span>
                  <span style={mono(10, f.severity === 'high' ? CLAY_DEEP : MUTED, { letterSpacing: '.04em' })}>{`${kindLabel(f.kind)} · ${SEV_LABEL[f.severity]}`}</span>
                  {f.quote && <span style={{ display: 'block', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: INK, margin: '2px 0' }}>{`"${f.quote}"`}</span>}
                  <span style={{ display: 'block', lineHeight: 1.5 }}>{f.problem}</span>
                  <span style={{ display: 'block', lineHeight: 1.5, color: SUB }}>{`Fix: ${f.fix}`}</span>
                </span>
              </li>
            ))}
          </ul>
          {probes.length > 0 && <div role="note" style={{ fontSize: 12, color: SUB, marginTop: 10 }}>{`The bench will put ${probes.length === 1 ? 'one of these' : 'two of these'} to you in the oral round and the live hearing.`}</div>}
        </div>
      )}
    </div>
  );
}
