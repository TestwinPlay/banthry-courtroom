import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig.js';

export const auth = getAuth(initializeApp(firebaseConfig));

/** Firebase ID token for the signed-in user; the backend rejects /api and /ws calls without one. */
export async function idToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : '';
}
