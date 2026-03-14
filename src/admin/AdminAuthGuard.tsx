/**
 * Admin auth guard — wraps all /admin routes.
 *
 * Checks:
 *   1. User is authenticated (Supabase session exists).
 *   2. User has is_admin = true in user_metadata.
 *
 * To grant admin access:
 *   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'
 *   WHERE email = 'admin@example.com';
 */

import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type AuthState = 'loading' | 'unauthenticated' | 'not_admin' | 'authorized';

interface AuthGuardProps {
  children: ReactNode;
}

export function AdminAuthGuard({ children }: AuthGuardProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthState('unauthenticated');
        return;
      }
      const isAdmin = session.user.user_metadata?.is_admin === true;
      setAuthState(isAdmin ? 'authorized' : 'not_admin');
    }
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setAuthState('unauthenticated'); return; }
      const isAdmin = session.user.user_metadata?.is_admin === true;
      setAuthState(isAdmin ? 'authorized' : 'not_admin');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setSignInError(error.message);
    } catch {
      setSignInError('Sign in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    });
    if (error) {
      setSignInError(error.message);
      setSigningIn(false);
      return;
    }
    if (data?.url) {
      window.location.assign(data.url);
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm w-full max-w-sm p-8">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Sign in</h1>
          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={signingIn}
            className="w-full h-10 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {signingIn ? 'Redirecting...' : 'Sign in with GitHub'}
          </button>
          <div className="relative my-4">
            <div className="border-t border-slate-200 dark:border-slate-700" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white dark:bg-slate-800 px-2 text-xs text-slate-400 dark:text-slate-500">
              or
            </span>
          </div>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent"
              />
            </div>
            {signInError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded px-3 py-2">
                {signInError}
              </p>
            )}
            <button
              type="submit"
              disabled={signingIn}
              className="w-full h-10 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              {signingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (authState === 'not_admin') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm w-full max-w-sm p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Access denied</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your account does not have admin access. Contact a system administrator.
          </p>
          <button
            onClick={() => { window.location.hash = ''; }}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
          >
            Return to site
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
