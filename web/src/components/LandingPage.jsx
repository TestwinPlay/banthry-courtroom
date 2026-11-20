import React, { useState } from 'react';

export function LandingPage({
  onStartHearing,
  onUploadJudgment,
  isGeneratingMoot,
  generatingStatus,
  side = 'Petitioner',
  setSide,
}) {
  const [selectedSide, setSelectedSide] = useState(side || 'Petitioner');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleLaunch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (setSide) setSide(selectedSide);

    if (uploadFile || uploadText.trim()) {
      if (onUploadJudgment) {
        setUploadStatus('Converting judgment into fictional moot problem...');
        await onUploadJudgment({ file: uploadFile, text: uploadText, side: selectedSide });
      }
    }

    if (onStartHearing) {
      onStartHearing({ side: selectedSide });
    }
  };

  return (
<div id="top" style={{ background: '#100E0C', color: '#F3EEE5', fontFamily: '\'IBM Plex Sans\', \'Helvetica Neue\', Arial, sans-serif', fontSize: '16px', lineHeight: '1.5', WebkitFontSmoothing: 'antialiased', overflow: 'hidden' }}>

<header style={{ maxWidth: '1240px', margin: '0 auto', padding: '18px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 24px' }}>
<a href="#top" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#F3EEE5', textDecoration: 'none', minHeight: '44px' }}>
<svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true"><rect x="2" y="4" width="26" height="3" rx="1" fill="#F3EEE5" /><rect x="5" y="10" width="4" height="13" rx="1" fill="#F3EEE5" /><rect x="13" y="10" width="4" height="13" rx="1" fill="#E0582F" /><rect x="21" y="10" width="4" height="13" rx="1" fill="#F3EEE5" /><rect x="2" y="25" width="26" height="2" rx="1" fill="#F3EEE5" /></svg>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '24px', lineHeight: '1' }}>Banthry Courtroom</span>
</a>
<nav aria-label="Primary" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 28px', fontSize: '15px' }}>
<a href="#how" style={{ color: '#CFC7BA', textDecoration: 'none', padding: '10px 0' }}>How it works</a>
<a href="#citations" style={{ color: '#CFC7BA', textDecoration: 'none', padding: '10px 0' }}>Citations</a>
<a href="#start" onClick={handleLaunch} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 20px', borderRadius: '999px', background: '#F3EEE5', color: '#100E0C', fontWeight: '600', textDecoration: 'none' }}>Start a hearing</a>
</nav>
</header>

<section style={{ maxWidth: '1240px', margin: '0 auto', padding: '72px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', textAlign: 'center' }}>
<h1 style={{ margin: '0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: 'clamp(54px, 8.4vw, 124px)', lineHeight: '0.92', letterSpacing: '-0.02em', textWrap: 'balance' }}>Argue. Get <em style={{ fontStyle: 'italic', color: '#F08A62' }}>interrupted.</em> Get better.</h1>
<p style={{ margin: '0', maxWidth: '30em', fontSize: 'clamp(17px, 1.6vw, 20px)', color: '#CFC7BA', textWrap: 'balance' }}>Three AI judges who listen, cut in, and check every case you cite. Built for Indian moot court and bail practice.</p>
<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '14px 24px' }}>
<a href="#start" onClick={handleLaunch} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minHeight: '56px', padding: '0 28px', borderRadius: '999px', background: '#C2421C', color: '#FFFFFF', fontWeight: '600', fontSize: '17px', textDecoration: 'none' }}>Start a hearing<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></a>
<a href="#how" style={{ color: '#F3EEE5', fontWeight: '500', textDecoration: 'underline', textUnderlineOffset: '6px', textDecorationColor: 'rgba(243, 238, 229, 0.35)', padding: '14px 0' }}>See how it works</a>
</div>
</section>

<section aria-label="A hearing in progress" style={{ maxWidth: '1240px', margin: '0 auto', padding: '56px 24px 0' }}>
<div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', aspectRatio: '2.15 / 1', minHeight: '380px', background: '#1A1410', boxShadow: '0 60px 120px -40px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(243, 238, 229, 0.08)' }}>
<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' }}>
<defs>
<linearGradient id="bcWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2E231B" /><stop offset="1" stopColor="#17110D" /></linearGradient>
<linearGradient id="bcDesk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#553B28" /><stop offset="1" stopColor="#2A1D14" /></linearGradient>
<linearGradient id="bcChair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#74271C" /><stop offset="1" stopColor="#3A120D" /></linearGradient>
<radialGradient id="bcLight" cx="0.5" cy="0" r="0.75"><stop offset="0" stopColor="#FFD9AE" stopOpacity="0.34" /><stop offset="0.55" stopColor="#FFD9AE" stopOpacity="0.06" /><stop offset="1" stopColor="#FFD9AE" stopOpacity="0" /></radialGradient>
<radialGradient id="bcVignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stopColor="#000000" stopOpacity="0" /><stop offset="1" stopColor="#000000" stopOpacity="0.6" /></radialGradient>
</defs>
<rect x="0" y="0" width="1200" height="560" fill="url(#bcWall)" />
<rect x="0" y="34" width="1200" height="12" fill="#3B2C21" />
<g fill="#FFFFFF" fillOpacity="0.025" stroke="#000000" strokeOpacity="0.25">
<rect x="10" y="62" width="88" height="250" rx="2" /><rect x="110" y="62" width="88" height="250" rx="2" /><rect x="210" y="62" width="88" height="250" rx="2" /><rect x="310" y="62" width="88" height="250" rx="2" /><rect x="410" y="62" width="88" height="250" rx="2" />
<rect x="702" y="62" width="88" height="250" rx="2" /><rect x="802" y="62" width="88" height="250" rx="2" /><rect x="902" y="62" width="88" height="250" rx="2" /><rect x="1002" y="62" width="88" height="250" rx="2" /><rect x="1102" y="62" width="88" height="250" rx="2" />
</g>
<path d="M512 320 V150 A88 88 0 0 1 688 150 V320 Z" fill="#120D0A" stroke="#6A4F39" strokeWidth="2" />
<path d="M530 320 V156 A70 70 0 0 1 670 156 V320" fill="none" stroke="#6A4F39" strokeOpacity="0.45" strokeWidth="1" />
<path d="M286 330 V176 Q286 132 332 132 Q378 132 378 176 V330 Z" fill="url(#bcChair)" />
<path d="M546 330 V142 Q546 92 600 92 Q654 92 654 142 V330 Z" fill="url(#bcChair)" />
<path d="M822 330 V176 Q822 132 868 132 Q914 132 914 176 V330 Z" fill="url(#bcChair)" />
<g fill="#0D0B0A">
<circle cx="332" cy="210" r="24" /><path d="M288 330 Q290 252 332 246 Q374 252 376 330 Z" />
<circle cx="600" cy="186" r="27" /><path d="M550 330 Q552 230 600 223 Q648 230 650 330 Z" />
<circle cx="868" cy="210" r="24" /><path d="M824 330 Q826 252 868 246 Q910 252 912 330 Z" />
</g>
<g fill="#F3EEE5">
<rect x="326" y="247" width="5" height="20" rx="1.5" /><rect x="333" y="247" width="5" height="20" rx="1.5" />
<rect x="593" y="224" width="6" height="23" rx="1.5" /><rect x="601" y="224" width="6" height="23" rx="1.5" />
<rect x="862" y="247" width="5" height="20" rx="1.5" /><rect x="869" y="247" width="5" height="20" rx="1.5" />
</g>
<circle cx="600" cy="186" r="30" fill="none" stroke="#F08A62" strokeOpacity="0.55" strokeWidth="2" />
<path d="M104 316 H1096 L1086 334 H114 Z" fill="#7A5A3E" />
<path d="M114 334 H1086 L1118 492 H82 Z" fill="url(#bcDesk)" />
<g stroke="#000000" strokeOpacity="0.22" strokeWidth="2">
<path d="M150 350 L144 476" /><path d="M200 350 L196 476" /><path d="M250 350 L247 476" /><path d="M400 350 L399 476" /><path d="M450 350 L450 476" /><path d="M750 350 L750 476" /><path d="M800 350 L801 476" /><path d="M950 350 L953 476" /><path d="M1000 350 L1004 476" /><path d="M1050 350 L1056 476" />
</g>
<rect x="296" y="356" width="72" height="18" rx="2" fill="#C9A46A" fillOpacity="0.85" />
<rect x="562" y="356" width="76" height="18" rx="2" fill="#C9A46A" fillOpacity="0.85" />
<rect x="832" y="356" width="72" height="18" rx="2" fill="#C9A46A" fillOpacity="0.85" />
<path d="M420 314 L478 306 L482 316 L424 322 Z" fill="#EDE6D8" fillOpacity="0.85" />
<path d="M716 312 L770 316 L768 324 L714 320 Z" fill="#EDE6D8" fillOpacity="0.7" />
<rect x="0" y="492" width="1200" height="68" fill="#0F0C0A" />
<rect x="0" y="0" width="1200" height="560" fill="url(#bcLight)" />
<path d="M60 560 L84 498 H246 L270 560 Z" fill="#090807" />
<path d="M164 498 Q166 462 190 446" fill="none" stroke="#090807" strokeWidth="6" strokeLinecap="round" />
<rect x="0" y="0" width="1200" height="560" fill="url(#bcVignette)" />
</svg>

<div className="bc-float" style={{ position: 'absolute', left: '4%', top: '9%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(12, 10, 9, 0.78)', backdropFilter: 'blur(8px)', border: '1px solid rgba(243, 238, 229, 0.12)', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '13px' }}>
<span aria-hidden="true" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#E5533A', animation: 'bc-pulse 1.6s ease-in-out infinite' }}></span>
<span style={{ color: '#CFC7BA' }}>You</span><span style={{ color: '#FF9F8A' }}>0:38</span>
</div>
<div className="bc-float" style={{ position: 'absolute', right: '4%', top: '9%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(12, 10, 9, 0.78)', backdropFilter: 'blur(8px)', border: '1px solid rgba(127, 211, 160, 0.35)', color: '#8FDDAE', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '13px' }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Arnesh Kumar · verified
</div>

<div style={{ position: 'absolute', left: '50%', bottom: '7%', transform: 'translateX(-50%)', width: 'min(780px, 90%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 24px 18px', borderRadius: '14px', background: 'rgba(10, 9, 8, 0.8)', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F08A62' }}>Presiding Judge</span>
<p style={{ margin: '0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: 'clamp(20px, 2.4vw, 32px)', lineHeight: '1.2', textWrap: 'balance' }}>“Counsel, let us stop you there. Answer the Bench directly — yes or no?”<span aria-hidden="true" style={{ display: 'inline-block', width: '2px', height: '0.9em', marginLeft: '4px', verticalAlign: '-0.1em', background: '#F3EEE5', animation: 'bc-caret 1s steps(1) infinite' }}></span></p>
</div>
</div>
</section>

<section id="how" style={{ maxWidth: '1240px', margin: '0 auto', padding: '140px 24px 120px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
<h2 style={{ margin: '0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: 'clamp(40px, 5vw, 68px)', lineHeight: '1', textWrap: 'balance' }}>From their judgment <em style={{ fontStyle: 'italic', color: '#F08A62' }}>to yours.</em></h2>
<ol style={{ listStyle: 'none', margin: '0', padding: '0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: '16px' }}>

<li style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 20px 24px', borderRadius: '20px', background: '#1A1714' }}>
<div aria-hidden="true" style={{ position: 'relative', height: '150px', borderRadius: '14px', background: '#221E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
<span style={{ position: 'absolute', width: '74px', height: '94px', borderRadius: '6px', background: '#CFC7BA', transform: 'translate(18px, 6px) rotate(8deg)' }}></span>
<span style={{ position: 'relative', width: '74px', height: '94px', borderRadius: '6px', background: '#F7F3EA', transform: 'rotate(-5deg)', display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 10px' }}>
<span style={{ display: 'block', height: '4px', width: '80%', borderRadius: '2px', background: '#CFC7BA' }}></span>
<span style={{ display: 'block', height: '4px', width: '100%', borderRadius: '2px', background: '#E2DBCD' }}></span>
<span style={{ display: 'block', height: '4px', width: '90%', borderRadius: '2px', background: '#E2DBCD' }}></span>
<span style={{ display: 'block', height: '4px', width: '60%', borderRadius: '2px', background: '#E2DBCD' }}></span>
<span style={{ alignSelf: 'flex-start', marginTop: 'auto', padding: '2px 5px', borderRadius: '3px', background: '#C2421C', color: '#FFFFFF', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '9px', fontWeight: '500' }}>PDF</span>
</span>
</div>
<h3 style={{ margin: '8px 0 0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: '30px', lineHeight: '1' }}>Drop a judgment</h3>
<p style={{ margin: '0', fontSize: '15px', color: '#B5ADA0' }}>Any SC or HC decision, or just its citation.</p>
</li>

<li style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 20px 24px', borderRadius: '20px', background: '#1A1714' }}>
<div aria-hidden="true" style={{ height: '150px', borderRadius: '14px', background: '#221E1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
<span style={{ display: 'flex', gap: '4px', padding: '5px', borderRadius: '999px', background: '#100E0C', border: '1px solid rgba(243, 238, 229, 0.12)' }}>
<span style={{ padding: '9px 16px', borderRadius: '999px', background: '#F3EEE5', color: '#100E0C', fontSize: '13px', fontWeight: '600' }}>Applicant</span>
<span style={{ padding: '9px 16px', borderRadius: '999px', color: '#B5ADA0', fontSize: '13px', fontWeight: '500' }}>State</span>
</span>
</div>
<h3 style={{ margin: '8px 0 0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: '30px', lineHeight: '1' }}>Pick a side</h3>
<p style={{ margin: '0', fontSize: '15px', color: '#B5ADA0' }}>The bench and opposing counsel flip to match.</p>
</li>

<li style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 20px 24px', borderRadius: '20px', background: '#1A1714' }}>
<div aria-hidden="true" style={{ position: 'relative', height: '150px', borderRadius: '14px', background: '#221E1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
<span style={{ position: 'absolute', width: '72px', height: '72px', borderRadius: '50%', border: '2px solid #E0582F', animation: 'bc-ring 2s ease-out infinite' }}></span>
<span style={{ position: 'absolute', width: '72px', height: '72px', borderRadius: '50%', border: '2px solid #E0582F', animation: 'bc-ring 2s ease-out -1s infinite' }}></span>
<span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#C2421C', color: '#FFFFFF' }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" /><path d="M19 11a7 7 0 0 1-14 0" /><path d="M12 18v3" /></svg></span>
</div>
<h3 style={{ margin: '8px 0 0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: '30px', lineHeight: '1' }}>Argue out loud</h3>
<p style={{ margin: '0', fontSize: '15px', color: '#B5ADA0' }}>They speak back, in real time.</p>
</li>

<li style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 20px 24px', borderRadius: '20px', background: '#1A1714' }}>
<div aria-hidden="true" style={{ height: '150px', borderRadius: '14px', background: '#221E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '64px', lineHeight: '1' }}>6.9</span>
<span style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '56px' }}>
<span style={{ display: 'block', width: '8px', height: '70%', borderRadius: '2px', background: '#CFC7BA' }}></span>
<span style={{ display: 'block', width: '8px', height: '80%', borderRadius: '2px', background: '#CFC7BA' }}></span>
<span style={{ display: 'block', width: '8px', height: '50%', borderRadius: '2px', background: '#E0582F' }}></span>
<span style={{ display: 'block', width: '8px', height: '60%', borderRadius: '2px', background: '#CFC7BA' }}></span>
<span style={{ display: 'block', width: '8px', height: '70%', borderRadius: '2px', background: '#CFC7BA' }}></span>
<span style={{ display: 'block', width: '8px', height: '90%', borderRadius: '2px', background: '#CFC7BA' }}></span>
<span style={{ display: 'block', width: '8px', height: '60%', borderRadius: '2px', background: '#CFC7BA' }}></span>
</span>
</div>
<h3 style={{ margin: '8px 0 0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: '30px', lineHeight: '1' }}>Get your scorecard</h3>
<p style={{ margin: '0', fontSize: '15px', color: '#B5ADA0' }}>Seven criteria, with your own words as proof.</p>
</li>
</ol>
</section>

<section aria-label="Interruptions" style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px 140px', display: 'flex', flexDirection: 'column', gap: '44px' }}>
<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px 48px' }}>
<h2 style={{ margin: '0', maxWidth: '11em', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: 'clamp(40px, 5vw, 68px)', lineHeight: '1', textWrap: 'balance' }}>They will cut you off.</h2>
<p style={{ margin: '0', maxWidth: '22em', fontSize: '18px', color: '#CFC7BA' }}>Ramble past 40 seconds and the Bench steps in. Seek leave, and it hears you out.</p>
</div>
<div style={{ position: 'relative', padding: '36px 32px 28px', borderRadius: '24px', background: '#1A1714' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
<span style={{ flex: 'none', fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '13px', color: '#8FDDAE' }}>You</span>
<div aria-hidden="true" style={{ position: 'relative', flex: '1', minWidth: '0', height: '72px', display: 'flex', alignItems: 'center', gap: '3px' }}>
{Array.from({ length: 72 }).map((_, i) => {
  const wave = Math.abs(Math.sin(i * 0.61) * Math.cos(i * 0.19)) * 0.75 + ((i * 37) % 11) / 44;
  const h = Math.round(10 + Math.min(1, wave) * 58);
  const c = i < 63 ? '#8FDDAE' : 'rgba(243, 238, 229, 0.16)';
  return (
    <span
      key={i}
      style={{
        flex: 1,
        minWidth: 1,
        height: `${h}px`,
        borderRadius: 2,
        background: c,
        transition: 'height 0.2s ease',
      }}
    />
  );
})}
<span style={{ position: 'absolute', left: '87.5%', top: '-14px', bottom: '-14px', width: '2px', background: '#E0582F' }}></span>
</div>
</div>
<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
<div style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px 20px', borderRadius: '16px 4px 16px 16px', background: '#F3EEE5', color: '#100E0C' }}>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '12px', color: '#A83716' }}>0:38 · Presiding Judge</span>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '26px', lineHeight: '1.15' }}>“Counsel. Yes or no?”</span>
</div>
</div>
</div>
</section>

<section id="citations" style={{ background: '#F4F0E8', color: '#14120F' }}>
<div style={{ maxWidth: '1240px', margin: '0 auto', padding: '130px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px', textAlign: 'center' }}>
<h2 style={{ margin: '0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: 'clamp(44px, 6vw, 84px)', lineHeight: '0.95', textWrap: 'balance' }}>No made-up cases.</h2>
<ul aria-label="Authorities checked live" style={{ listStyle: 'none', margin: '0', padding: '0', maxWidth: '980px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Arnesh Kumar</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Gurbaksh Singh Sibbia</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Balchand</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Satender Kumar Antil</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>P. Chidambaram</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Sushila Aggarwal</li>
<li style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 22px', borderRadius: '999px', background: '#14120F', color: '#FF9F8A', fontSize: '18px', fontWeight: '600', transform: 'rotate(-3deg)', boxShadow: '0 20px 40px -16px rgba(20, 18, 15, 0.6)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>“Kapoor v. State” — not found</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Joginder Kumar</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>D.K. Basu</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Siddharth</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Bhajan Lal</li>
<li style={{ padding: '10px 18px', borderRadius: '999px', background: '#E3F1E8', color: '#1E6B43', fontSize: '16px', fontWeight: '500' }}>Maneka Gandhi</li>
</ul>
<p style={{ margin: '0', fontSize: '18px', color: '#5E574C', textWrap: 'balance' }}>Every case, from anyone in the room, checked in about two seconds.</p>
</div>
</section>

<section aria-label="Scorecard" style={{ maxWidth: '1240px', margin: '0 auto', padding: '140px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))', gap: '48px 80px', alignItems: 'center' }}>
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
<h2 style={{ margin: '0', fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontWeight: '400', fontSize: 'clamp(40px, 5vw, 68px)', lineHeight: '1', textWrap: 'balance' }}>Scored like a judgment.</h2>
<div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '24px' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: 'clamp(140px, 17vw, 240px)', lineHeight: '0.8', letterSpacing: '-0.03em' }}>6.9</span>
<span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', fontSize: '16px', color: '#B5ADA0' }}>/ 10</span>
</div>
</div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
<ul aria-label="Sample scores" style={{ listStyle: 'none', margin: '0', padding: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#CFC7BA' }}>Reasoning</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '70%', height: '8px', borderRadius: '4px', background: '#F3EEE5' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right' }}>7</span></li>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#CFC7BA' }}>Authorities</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '80%', height: '8px', borderRadius: '4px', background: '#F3EEE5' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right' }}>8</span></li>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#F3EEE5', fontWeight: '600' }}>Responsiveness</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '50%', height: '8px', borderRadius: '4px', background: '#E0582F' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right', color: '#F08A62' }}>5</span></li>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#CFC7BA' }}>Under pressure</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '60%', height: '8px', borderRadius: '4px', background: '#F3EEE5' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right' }}>6</span></li>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#CFC7BA' }}>Structure</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '70%', height: '8px', borderRadius: '4px', background: '#F3EEE5' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right' }}>7</span></li>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#CFC7BA' }}>Court manner</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '90%', height: '8px', borderRadius: '4px', background: '#F3EEE5' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right' }}>9</span></li>
<li style={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr) 24px', alignItems: 'center', gap: '16px', fontSize: '15px' }}><span style={{ color: '#CFC7BA' }}>Delivery</span><span aria-hidden="true" style={{ display: 'block', height: '8px', borderRadius: '4px', background: '#2A2520', overflow: 'hidden' }}><span style={{ display: 'block', width: '60%', height: '8px', borderRadius: '4px', background: '#F3EEE5' }}></span></span><span style={{ fontFamily: '\'IBM Plex Mono\', ui-monospace, Menlo, monospace', textAlign: 'right' }}>6</span></li>
</ul>
<blockquote style={{ margin: '0', padding: '18px 22px', borderRadius: '16px', background: '#1A1714', display: 'flex', flexDirection: 'column', gap: '6px' }}>
<span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '22px', lineHeight: '1.25' }}>“If I may first complete my submission on the facts, My Lord…”</span>
<span style={{ fontSize: '13px', color: '#B5ADA0' }}>Quoted from your transcript · dodged a yes-or-no question twice</span>
</blockquote>
</div>
</section>

<section id="start" style={{ padding: '0 24px 120px' }}>
<div style={{ maxWidth: '1240px', margin: '0 auto', padding: '80px 24px', borderRadius: '32px', background: '#C2421C', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', textAlign: 'center' }}>
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.15)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', letterSpacing: '0.06em', color: '#FFE6DC' }}>
    HIGH COURT APPELLATE DIVISION • COURT NO. 1
  </div>

  <h2 style={{ margin: '0', fontFamily: "'Instrument Serif', 'Times New Roman', Georgia, serif", fontWeight: '400', fontSize: 'clamp(48px, 7vw, 104px)', lineHeight: '0.92', letterSpacing: '-0.01em', textWrap: 'balance' }}>
    Your matter is listed.
  </h2>

  <p style={{ margin: '0', maxWidth: '34em', fontSize: '18px', color: '#FFE6DC', lineHeight: 1.5 }}>
    Step to the podium. Argue before the Division Bench, face sharp judicial questions, and test your authorities in real time.
  </p>

  {/* Side Selector */}
  <div style={{ background: 'rgba(0, 0, 0, 0.22)', padding: '6px', borderRadius: '999px', display: 'inline-flex', gap: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
    <button
      type="button"
      onClick={() => setSelectedSide('Petitioner')}
      style={{
        padding: '10px 22px',
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        background: selectedSide === 'Petitioner' ? '#FFFFFF' : 'transparent',
        color: selectedSide === 'Petitioner' ? '#8E2E12' : '#FFE6DC',
      }}
    >
      Argue for Applicant (Accused)
    </button>
    <button
      type="button"
      onClick={() => setSelectedSide('Respondent')}
      style={{
        padding: '10px 22px',
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        background: selectedSide === 'Respondent' ? '#FFFFFF' : 'transparent',
        color: selectedSide === 'Respondent' ? '#8E2E12' : '#FFE6DC',
      }}
    >
      Argue for State (Prosecution)
    </button>
  </div>

  {/* Matter Preview Card */}
  <div style={{ maxWidth: '640px', width: '100%', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '20px', padding: '20px 24px', textAlign: 'left' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', color: '#FFD2C2' }}>
        MATTER RECORD • LISTED FOR PRE-ARREST BAIL
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#8FDDAE' }}>
        ● BENCH READY
      </span>
    </div>
    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '24px', color: '#FFFFFF', marginBottom: '4px' }}>
      Devika Rao v. The State
    </div>
    <div style={{ fontSize: '13px', color: '#FFE6DC', lineHeight: 1.4 }}>
      Anticipatory Bail under Section 482 BNSS in ₹4.2 Crore input subsidy audit. Disputed Section 35(3) notice of appearance and undated seizure memo at Exhibit P-3.
    </div>
  </div>

  {/* Judgment Upload Toggle */}
  <div style={{ maxWidth: '640px', width: '100%' }}>
    <button
      type="button"
      onClick={() => setShowUpload(!showUpload)}
      style={{
        background: 'transparent',
        border: '1px dashed rgba(255, 255, 255, 0.4)',
        color: '#FFE6DC',
        padding: '10px 18px',
        borderRadius: '12px',
        fontSize: '13px',
        cursor: 'pointer',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span>📄</span>
      <span>{showUpload ? '▲ Close Judgment Upload' : '▼ Or Upload Real Judgment / Paste Legal Matrix to Convert'}</span>
    </button>

    {showUpload && (
      <div style={{ marginTop: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", color: '#FFE6DC' }}>
          PASTE JUDGMENT TEXT OR PROPOSITION:
        </label>
        <textarea
          rows={3}
          value={uploadText}
          onChange={(e) => setUploadText(e.target.value)}
          placeholder="Paste Indian Supreme Court / High Court judgment excerpt or proposition paragraphs under BNS/BNSS..."
          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setUploadFile(e.target.files && e.target.files[0])}
            style={{ fontSize: '12px', color: '#FFE6DC' }}
          />
          {uploadFile && <span style={{ fontSize: '11px', color: '#8FDDAE' }}>✓ {uploadFile.name}</span>}
        </div>
        {uploadStatus && (
          <div style={{ fontSize: '12px', color: '#FFD2C2', fontStyle: 'italic' }}>
            {uploadStatus}
          </div>
        )}
      </div>
    )}
  </div>

  {/* Launch Button */}
  <button
    type="button"
    onClick={handleLaunch}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      minHeight: '58px',
      padding: '0 34px',
      borderRadius: '999px',
      background: '#FFFFFF',
      color: '#8E2E12',
      fontWeight: '700',
      fontSize: '17px',
      textDecoration: 'none',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      transition: 'transform 0.15s ease',
    }}
  >
    <span>Start Hearing · Enter Courtroom</span>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  </button>

  <p style={{ margin: '0', fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, monospace", fontSize: '13px', color: '#FFE6DC' }}>
    PDF · DOCX · TXT · or a citation
  </p>
</div>
</section>

<footer style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px 48px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px 32px', fontSize: '13px', color: '#B5ADA0' }}>
<span><span style={{ fontFamily: '\'Instrument Serif\', \'Times New Roman\', Georgia, serif', fontSize: '18px', color: '#F3EEE5' }}>Banthry Courtroom</span> · by <a href="https://banthry.in/" style={{ color: '#F3EEE5' }}>Banthry Prep</a></span>
<span>Practice moot court, not legal advice.</span>
<span>© 2026 Banthry</span>
</footer>

</div>

  );
}

export default LandingPage;
