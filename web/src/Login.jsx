import React, { useState } from 'react';
import {
  GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase.js';

const SERIF = "'Instrument Serif', 'Times New Roman', Georgia, serif";
const SANS = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

const MESSAGES = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
  'auth/operation-not-allowed': 'This sign-in method is not switched on yet.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
};

export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
    <rect x="2" y="4" width="26" height="3" rx="1" fill="#F3EEE5" />
    <rect x="5" y="10" width="4" height="13" rx="1" fill="#F3EEE5" />
    <rect x="13" y="10" width="4" height="13" rx="1" fill="#E0582F" />
    <rect x="21" y="10" width="4" height="13" rx="1" fill="#F3EEE5" />
    <rect x="2" y="25" width="26" height="2" rx="1" fill="#F3EEE5" />
  </svg>
);

const field = {
  minHeight: 50, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(243, 238, 229, 0.2)',
  background: '#100E0C', color: '#F3EEE5', fontFamily: SANS, fontSize: 15, width: '100%',
};

export function Login() {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setError(''); setNote(''); setBusy(true);
    try { await fn(); } catch (e) { setError(MESSAGES[e.code] || 'Sign-in failed. Try again.'); }
    finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    run(() => mode === 'signin'
      ? signInWithEmailAndPassword(auth, email.trim(), password)
      : createUserWithEmailAndPassword(auth, email.trim(), password));
  };

  const reset = () => {
    if (!email.trim()) { setError('Enter your email first, then ask for a reset link.'); return; }
    run(async () => { await sendPasswordResetEmail(auth, email.trim()); setNote('Reset link sent. Check your inbox.'); });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: SANS, WebkitFontSmoothing: 'antialiased' }}>
      <header style={{ maxWidth: 1240, width: '100%', margin: '0 auto', padding: '18px 24px' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#F3EEE5', textDecoration: 'none', minHeight: 44 }}>
          <Logo />
          <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1 }}>Banthry Courtroom</span>
        </a>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 64px' }}>
        <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F08A62' }}>Court Master</span>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(44px, 8vw, 64px)', lineHeight: 0.95, textWrap: 'balance' }}>
              {mode === 'signin' ? <>Your matter is <em style={{ color: '#F08A62' }}>listed.</em></> : <>Enter your <em style={{ color: '#F08A62' }}>appearance.</em></>}
            </h1>
            <p style={{ margin: 0, color: '#CFC7BA', fontSize: 16 }}>
              {mode === 'signin' ? 'Sign in to take your seat before the Bench.' : 'Create an account to start arguing.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24, borderRadius: 24, background: '#1A1714' }}>
            <button type="button" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: 999, border: 0, background: '#F3EEE5', color: '#100E0C', fontFamily: SANS, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </button>

            <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8F877B', fontSize: 13 }}>
              <span style={{ flex: 1, height: 1, background: 'rgba(243, 238, 229, 0.12)' }} />or<span style={{ flex: 1, height: 1, background: 'rgba(243, 238, 229, 0.12)' }} />
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#B5ADA0' }}>
                Email
                <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="counsel@lawschool.edu.in" style={field} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#B5ADA0' }}>
                Password
                <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
              </label>
              {error && <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: '#2B1712', color: '#FF9F8A', fontSize: 14 }}>{error}</p>}
              {note && <p role="status" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: '#12261B', color: '#8FDDAE', fontSize: 14 }}>{note}</p>}
              <button type="submit" disabled={busy}
                style={{ minHeight: 52, borderRadius: 999, border: 0, background: '#C2421C', color: '#FFFFFF', fontFamily: SANS, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
              <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNote(''); }}
                style={{ background: 'none', border: 0, padding: '8px 0', color: '#F3EEE5', textDecoration: 'underline', textUnderlineOffset: 5, textDecorationColor: 'rgba(243, 238, 229, 0.35)', fontFamily: SANS, fontSize: 14, cursor: 'pointer' }}>
                {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
              </button>
              {mode === 'signin' && (
                <button type="button" onClick={reset} style={{ background: 'none', border: 0, padding: '8px 0', color: '#B5ADA0', fontFamily: SANS, fontSize: 14, cursor: 'pointer' }}>Forgot password?</button>
              )}
            </div>
          </div>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: '#8F877B' }}>Practice moot court, not legal advice.</p>
        </div>
      </main>
    </div>
  );
}
