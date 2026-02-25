import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── OAuth redirect cleanup ────────────────────────────────────────────────────
// After GitHub OAuth, Supabase may return tokens in the hash (implicit flow) or
// a `code` in the query string (PKCE flow). Both leave the URL dirty.
// Clean before React renders so the hash router never sees garbage.
(function cleanOAuthRedirect() {
  const TOKEN_HASH_PARAMS = [
    'access_token', 'refresh_token', 'provider_token', 'expires_in', 'token_type',
  ];
  const hash = window.location.hash;
  const search = window.location.search;
  const cleanTarget = `${window.location.pathname}${window.location.search.replace(/[?&]code=[^&]*/, '').replace(/^&/, '?')}#/admin`;

  if (TOKEN_HASH_PARAMS.some((p) => hash.includes(`${p}=`))) {
    // Implicit flow: tokens embedded in the hash fragment
    history.replaceState(null, '', `${window.location.pathname}#/admin`);
  } else if (search.includes('code=') || search.includes('error=')) {
    // PKCE flow: authorization code or error in the query string
    history.replaceState(null, '', cleanTarget);
  }
})();
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
