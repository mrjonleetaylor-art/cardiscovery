/**
 * AuthCallback — rendered at /auth/callback after GitHub OAuth (PKCE flow).
 *
 * GitHub returns ?code=… in the query string. We call exchangeCodeForSession
 * explicitly rather than relying on detectSessionInUrl, which avoids race
 * conditions between Supabase's internal exchange and our own listener.
 *
 * On success  → window.location.replace('/#/admin')
 * On failure  → show error + manual link back to sign-in
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const [status, setStatus] = useState<'exchanging' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const exchanged = useRef(false); // guard against React StrictMode double-invoke

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ data, error }) => {
        if (error || !data.session) {
          setErrorMessage(error?.message ?? 'Authentication failed. No session returned.');
          setStatus('error');
          return;
        }
        // Session established — replace history so Back doesn't return to callback
        window.location.replace('/#/admin');
      });
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-sm p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Sign-in failed</h1>
          <p className="text-sm text-slate-500 mb-1">Could not complete authentication.</p>
          {errorMessage && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-6 text-left">
              {errorMessage}
            </p>
          )}
          <a
            href="/#/admin"
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">Signing you in…</p>
        <p className="text-xs text-slate-400 mt-1">Please wait</p>
      </div>
    </div>
  );
}
