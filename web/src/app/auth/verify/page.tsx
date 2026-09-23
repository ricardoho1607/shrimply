"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRequiredSetupRoute, ROUTES } from '@/config/routes';
import { getVerificationUiCopy } from '../../../../../shared/verificationUiCopy';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { currentLanguage } = useLanguage();
  const { user, loading, isAuthenticated, emailVerified, needsRoleSelection, needsSetup,
    resendVerificationEmail, refreshEmailVerification, signOut } = useAuth();
  const copy = getVerificationUiCopy(currentLanguage);
  const [busy, setBusy] = useState<'send' | 'check' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(ROUTES.auth);
    } else if (emailVerified) {
      router.replace(needsRoleSelection ? ROUTES.roleSelection
        : needsSetup ? getRequiredSetupRoute(user?.role) : ROUTES.dashboard);
    }
  }, [emailVerified, isAuthenticated, loading, needsRoleSelection, needsSetup, router, user?.role]);

  const resend = async () => {
    setBusy('send');
    setMessage('');
    try {
      await resendVerificationEmail();
      setMessage(copy.sent);
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code : undefined;
      setMessage(code === 'functions/resource-exhausted' ? copy.wait : copy.error);
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    setBusy('check');
    setMessage('');
    try {
      const verified = await refreshEmailVerification();
      if (!verified) setMessage(copy.notYet);
    } catch {
      setMessage(copy.checkError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f5f8fb' }}>
      <section style={{ width: '100%', maxWidth: 480, padding: 32, borderRadius: 16, background: '#fff', boxShadow: '0 12px 36px rgba(15,76,117,.1)', color: '#163047' }}>
        <div style={{ color: '#0F4C75', fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Shrimply</div>
        <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>{copy.title}</h1>
        <p style={{ lineHeight: 1.6, margin: '0 0 12px' }}>{copy.instructions}</p>
        {user?.email && <p style={{ fontWeight: 700, overflowWrap: 'anywhere', margin: '0 0 24px' }}>{user.email}</p>}
        {message && <p role="status" aria-live="polite" style={{ padding: 12, borderRadius: 8, background: '#eaf4fa', lineHeight: 1.5 }}>{message}</p>}
        <button type="button" onClick={check} disabled={busy !== null || loading}
          style={{ width: '100%', border: 0, borderRadius: 8, padding: '14px 18px', background: '#0F4C75', color: '#fff', fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          {busy === 'check' ? copy.checking : copy.check}
        </button>
        <button type="button" onClick={resend} disabled={busy !== null || loading}
          style={{ width: '100%', border: '1px solid #3282B8', borderRadius: 8, padding: '14px 18px', background: '#fff', color: '#0F4C75', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
          {busy === 'send' ? copy.sending : copy.resend}
        </button>
        <p style={{ marginTop: 24, fontSize: 14 }}><a href="mailto:shrimply.tech@gmail.com" style={{ color: '#0F4C75' }}>{copy.help}</a></p>
        <button type="button" onClick={() => void signOut()} style={{ border: 0, background: 'none', padding: 0, color: '#0F4C75', textDecoration: 'underline', cursor: 'pointer' }}>{copy.signOut}</button>
      </section>
    </main>
  );
}
