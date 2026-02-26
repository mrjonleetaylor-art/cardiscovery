/**
 * AuthCallback — rendered at /auth/callback after GitHub OAuth.
 *
 * With PKCE flow, Supabase returns ?code=… in the query string.
 * The Supabase client (detectSessionInUrl: true) automatically exchanges
 * the code for a session when initialised. This component waits for that
 * exchange to complete, then navigates to /#/admin.
 *
 * window.location.replace('/#/admin') is intentional — it replaces the
 * /auth/callback history entry so the user can't "back" into the callback URL.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const [status, setStatus] = useState<'waiting' | 'error'>('waiting');

  useEffect(() => {
    let done = false;

    function goToAdmin() {
      if (done) return;
      done = true;
      // Clean the URL (removes ?code=… or #access_token=…) then navigate
      window.location.replace('/#/admin');
    }

    // Fast path: session may already be established by the time we mount
    // (Supabase exchanges the code synchronously on client init when
    // detectSessionInUrl is true and the URL contains ?code=…)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        goToAdmin();
      }
    });

    // Slow path: listen for the SIGNED_IN event fired after async exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          goToAdmin();
        }
        if (event === 'SIGNED_OUT') {
          // Exchange failed or user is not authenticated — go to sign-in
          goToAdmin();
        }
      },
    );

    // Timeout safety net — if neither fires within 8 s, go anyway
    const timeout = setTimeout(() => {
      setStatus('error');
      goToAdmin();
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">
          {status === 'waiting' ? 'Signing you in…' : 'Redirecting…'}
        </p>
        <p className="text-xs text-slate-400 mt-1">Please wait</p>
      </div>
    </div>
  );
}
