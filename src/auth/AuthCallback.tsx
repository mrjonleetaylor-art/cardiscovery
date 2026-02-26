/**
 * AuthCallback — rendered at /auth/callback after GitHub OAuth (PKCE flow).
 *
 * Supabase returns ?code=… in the query string. We call exchangeCodeForSession
 * explicitly. On success, replace history to remove ?code= then navigate to
 * /#/admin. On failure, render an error card with a link back.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exchanged = useRef(false); // guard against React StrictMode double-invoke

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ data, error }) => {
        if (error || !data.session) {
          setErrorMessage(error?.message ?? 'Authentication failed. No session returned.');
          return;
        }
        window.location.href = `${window.location.origin}/#/admin`;
      });
  }, []);

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-sm p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Sign-in failed</h1>
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-6 text-left">
            {errorMessage}
          </p>
          <a href="/#/admin" className="text-sm text-slate-500 hover:text-slate-700 underline">
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">Completing sign-in…</p>
        <p className="text-xs text-slate-400 mt-1">Please wait</p>
      </div>
    </div>
  );
}
