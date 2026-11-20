// Shared tokens and style helpers for Moot Court. Self-contained standalone definitions.

export const CLAY = '#C2410C';
export const CLAY_DARK = '#FB8A4F';
export const DARK_LINE = '#23252B';
export const INK = '#111318';
export const LINE = '#E2E0D8';
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
export const MUTED = '#71747C';
export const PAPER = '#FAF9F5';
export const SOFT = '#F4F2EB';
export const SUB = '#555860';
export const SUBD = '#9FA2AA';
export const WHITE = '#FFFFFF';

export const LINE_SOFT = '#EFEDE7';
export const LINE_STRONG = '#C9C7BE';
export const RAISED = '#FBFAF7';
export const STONE = '#E9E8E2';
export const CLAY_DEEP = '#9A3412';
export const DIM = '#8B8E96';
export const GREEN_BG = '#DFF1E6';
export const GREEN_FG = '#1E6B43';

export const mono = (size = 10, color = MUTED, extra) => ({ fontFamily: MONO, fontSize: size, letterSpacing: '.08em', color, ...extra });
export const card = { background: WHITE, border: `1px solid ${LINE}`, borderRadius: 16 };
export const btn = (bg, fg, extra) => ({ border: 0, cursor: 'pointer', background: bg, color: fg, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 500, minHeight: 44, ...extra });
export const ghost = (extra) => ({ cursor: 'pointer', background: WHITE, color: INK, border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, minHeight: 44, ...extra });
export const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

// Motion (spec): mWave voice bars, mGlow ring. Reduced motion switches both off. Hover on a card border goes to ink.
export const MOOT_CSS = `
@keyframes mWave{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
@keyframes mGlow{0%,100%{box-shadow:0 0 0 0 rgba(251,138,79,.55)}50%{box-shadow:0 0 0 12px rgba(251,138,79,0)}}
.moot-v2,.moot-v2 *{box-sizing:border-box}
.moot-v2 button,.moot-v2 input,.moot-v2 textarea,.moot-v2 select{font:inherit}
.moot-v2 button:focus-visible,.moot-v2 input:focus-visible,.moot-v2 textarea:focus-visible,.moot-v2 select:focus-visible{outline:2px solid #C2410C;outline-offset:2px}
.moot-v2 .moot-dark button:focus-visible{outline-color:#FB8A4F}
.moot-v2 .moot-hover:hover{border-color:#111318 !important}
.moot-v2 .moot-scroll{scrollbar-width:thin}
@media (prefers-reduced-motion:reduce){.moot-v2 *{animation:none !important;transition:none !important}}
`;
