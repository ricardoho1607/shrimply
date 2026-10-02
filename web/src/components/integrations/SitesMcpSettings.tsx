"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Link2, Unlink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

type ApiResponse = {
  data?: { linked?: boolean };
  error?: { message?: string };
};

const getErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json() as ApiResponse;
    if (typeof payload.error?.message === 'string') return payload.error.message;
  } catch {
    // A missing Vercel rewrite returns an HTML 404; keep the UI error readable.
  }
  return response.ok ? 'Shrimply returned an unexpected response.' : 'Could not reach the Sites MCP service. Try again shortly.';
};

export default function SitesMcpSettingsPage() {
  const { user } = useAuth();
  const [linked, setLinked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const getIdToken = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!user?.uid || !firebaseUser || firebaseUser.uid !== user.uid) {
      throw new Error('Your Shrimply sign-in is still loading. Refresh this page and try again.');
    }
    return firebaseUser.getIdToken();
  }, [user]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!user?.uid) {
        if (active) setChecking(false);
        return;
      }
      try {
        const token = await getIdToken();
        const response = await fetch('/api/sites-mcp/status', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error(await getErrorMessage(response));
        const payload = await response.json() as ApiResponse;
        if (active) setLinked(payload.data?.linked === true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the current link status.');
      } finally {
        if (active) setChecking(false);
      }
    });
    return () => { active = false; };
  }, [getIdToken, user]);

  const handlePair = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    setError('');
    const normalizedCode = pairCode.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/i.test(normalizedCode)) {
      setError('Enter the 64-character one-time code from Shrimply Admin.');
      return;
    }
    setBusy(true);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/sites-mcp/pair', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairCode: normalizedCode }),
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setPairCode('');
      setLinked(true);
      setNotice('Shrimply Admin is linked to this Shrimply account.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not link this account.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('Unlink Shrimply Admin from this Shrimply account? Its farm data tools will stop working until you link again.')) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const token = await getIdToken();
      const response = await fetch('/api/sites-mcp/revoke', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setLinked(false);
      setNotice('Shrimply Admin is unlinked.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not unlink this account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px', color: 'var(--text-primary)', fontFamily: 'var(--jakarta)' }}>
      <Link href="/dashboard/settings" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--primary)', textDecoration: 'none', fontSize: 14, marginBottom: 22 }}>
        <ArrowLeft size={16} /> Settings
      </Link>
      <section className="glass-card" style={{ padding: 28, borderRadius: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: 'var(--primary)' }}>Sites MCP access</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: '10px 0 22px' }}>
          Link the private <strong>Shrimply Admin</strong> Site to your signed-in Shrimply account. The connection grants read-only access to farm data that your current company role can already view.
        </p>

        <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 12, background: linked ? '#effaf3' : '#f2f7fa', color: linked ? '#176b3a' : 'var(--text-muted)', marginBottom: 22 }}>
          {checking ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          <span>{checking ? 'Checking connection…' : linked ? 'Linked to this Shrimply account' : 'Not linked'}</span>
        </div>

        {!linked && (
          <>
            <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Link account</h2>
            <ol style={{ color: 'var(--text-muted)', lineHeight: 1.65, paddingLeft: 21 }}>
              <li>Open <a href="https://shrimply-admin.ricardofransiskusho.chatgpt.site/link" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Shrimply Admin’s link page</a> in the same account you use for the MCP plugin.</li>
              <li>Generate a code, then paste it below within five minutes.</li>
            </ol>
            <form onSubmit={handlePair} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              <label htmlFor="sites-mcp-pair-code" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>One-time link code</label>
              <input
                id="sites-mcp-pair-code"
                value={pairCode}
                onChange={(event) => setPairCode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                maxLength={64}
                inputMode="text"
                placeholder="Paste the 64-character code"
                style={{ minHeight: 46, border: '1px solid var(--border)', borderRadius: 10, padding: '0 14px', color: 'var(--text-primary)', background: 'var(--bg-mid)', fontFamily: 'ui-monospace, monospace' }}
                disabled={busy || checking || !user?.uid}
              />
              <button type="submit" disabled={busy || checking || !user?.uid} className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 44, border: 0, borderRadius: 10, padding: '0 16px', cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Link2 size={17} />}
                Link account
              </button>
            </form>
          </>
        )}

        {linked && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>Farm tools remain subject to your current company membership and permissions.</p>
            <button type="button" onClick={() => void handleUnlink()} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 42, border: '1px solid #e6b4b4', borderRadius: 10, background: '#fff', color: '#a93232', padding: '0 14px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
              Unlink
            </button>
          </div>
        )}

        {notice && <p role="status" style={{ color: '#176b3a', margin: '18px 0 0', fontSize: 14 }}>{notice}</p>}
        {error && <p role="alert" style={{ color: '#b42318', margin: '18px 0 0', fontSize: 14 }}>{error}</p>}
        {!user?.uid && <p role="alert" style={{ color: '#b42318', margin: '18px 0 0', fontSize: 14 }}>Sign in to Shrimply to manage this connection.</p>}
      </section>
    </main>
  );
}
