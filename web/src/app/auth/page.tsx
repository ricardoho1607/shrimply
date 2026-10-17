"use client";
import { getUserErrorMessage } from '@/lib/userError';


import React, { useEffect, useState } from 'react';
import { LogIn, ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getRequiredSetupRoute, ROUTES } from '@/config/routes';

const getLoginErrorMessage = (error: unknown, fallback: string) => {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (errorCode === 'auth/network-request-failed') {
    return 'Unable to reach the secure sign-in service. Check your connection and try again.';
  }

  return getUserErrorMessage(error, fallback);
};

export default function AuthPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginRequested, setLoginRequested] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token') || undefined;

  const {
    signIn,
    signInWithGoogle,
    resetPassword,
    isAuthenticated,
    emailVerified,
    needsRoleSelection,
    needsSetup,
    user,
    loading: authLoading,
    companyLoading,
  } = useAuth();

  useEffect(() => {
    if (!loginRequested || !isAuthenticated) return;

    if (!emailVerified) {
      router.replace('/auth/verify');
      return;
    }

    if (authLoading || companyLoading) return;

    if (needsRoleSelection) {
      router.replace(ROUTES.roleSelection);
      return;
    }

    if (needsSetup) {
      router.replace(getRequiredSetupRoute(user?.role));
      return;
    }

    router.replace(ROUTES.dashboard);
  }, [
    authLoading,
    companyLoading,
    emailVerified,
    isAuthenticated,
    loginRequested,
    needsRoleSelection,
    needsSetup,
    router,
    user?.role,
  ]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await signIn(email, password, inviteToken);
      setLoginRequested(true);
    } catch (err: unknown) {
      setError(getLoginErrorMessage(err, t.messages.error || 'Failed to login'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Enter your email address first, then request a password reset.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess('Password reset email sent. Check your inbox to continue.');
    } catch (err: unknown) {
      setError(getUserErrorMessage(err, 'Could not send password reset email.'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithGoogle(inviteToken);
      setLoginRequested(true);
    } catch (err: unknown) {
      setError(getUserErrorMessage(err, 'Google sign-in failed.'));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-frame">
        <section className="auth-brand-panel" aria-label="Shrimply portal">
          <Link href="/" className="auth-back">
            <ArrowLeft size={16} />
            {t.auth.backToHome || 'Back to Home'}
          </Link>

          <div className="brand-lockup">
            <Image
              src="/assets/shrimplylogoweb.webp"
              width={500}
              height={160}
              alt="Shrimply"
              className="auth-logo"
            />
            <div>
              <p className="auth-kicker">{t.auth.portalNote || 'Official Shrimply Portal'}</p>
              <h1 className="auth-title">Access your Shrimply workspace.</h1>
            </div>
          </div>

          <div className="auth-proof-row">
            <div>
              <span>Realtime</span>
              <strong>Farm data</strong>
            </div>
            <div>
              <span>Protected</span>
              <strong>Team access</strong>
            </div>
            <div>
              <span>Orson</span>
              <strong>AI insights</strong>
            </div>
          </div>
        </section>

        <section className="auth-form-panel" aria-label="Login form">
          <div className="mobile-auth-header">
            <Link href="/" className="mobile-auth-back">
              <ArrowLeft size={17} />
              {t.auth.backToHome || 'Back to Home'}
            </Link>
            <Image
              src="/assets/shrimplylogoweb.webp"
              width={500}
              height={160}
              alt="Shrimply"
              className="mobile-auth-logo"
            />
          </div>

          <div className="form-heading">
            <div className="secure-badge">
              <ShieldCheck size={16} />
              Secure login
            </div>
            <h2>{t.auth.loginTitle || 'Welcome back'}</h2>
            <p>{t.auth.loginSubtitle || "Access your farm's intelligent command center"}</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="field-group">
              <label htmlFor="login-email">{t.auth.email || 'Email Address'}</label>
              <div className="input-wrap">
                <Mail size={18} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="login-password">{t.auth.password || 'Password'}</label>
                <button type="button" onClick={handlePasswordReset} disabled={resetLoading} className="reset-link">
                  {resetLoading ? 'Sending...' : t.auth.forgotPassword || 'Forgot password?'}
                </button>
              </div>
              <div className="input-wrap">
                <Lock size={18} />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="auth-alert error" role="alert">{error}</div>}
            {success && <div className="auth-alert success" role="status">{success}</div>}

            <button type="submit" disabled={loading} className="auth-submit">
              {/* Keep translated text inside a stable element during loading changes. */}
              <span>{loading
                ? (t.auth.authenticating || 'Authenticating...')
                : (t.auth.enterDashboard || 'Enter Dashboard')}</span>
              {!loading && <LogIn size={18} />}
            </button>
          </form>

          <div className="auth-divider" />

          <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || loading} className="auth-submit" style={{ background: '#FFFFFF', color: '#0F4C75', border: '1px solid #BBE1FA', marginBottom: '18px' }}>
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <div className="auth-join">
            {t.auth.noAccount || "Don't have an account?"}{' '}
            <Link href={inviteToken ? `${ROUTES.join}?token=${encodeURIComponent(inviteToken)}` : ROUTES.join}>
              {t.auth.joinUs || 'Join Us'}
            </Link>
          </div>

          <p className="auth-footnote">
            {t.auth.secureNote || 'Securely powered by Firebase Enterprise.'}
          </p>
        </section>
      </div>

      <style jsx>{`
        .auth-shell {
          min-height: 100dvh;
          background:
            linear-gradient(180deg, #f8fafc 0%, #eef5fa 100%);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          font-family: var(--jakarta);
          font-size: var(--text-body);
          font-weight: var(--weight-regular);
          line-height: var(--leading-body);
        }

        .auth-frame {
          width: min(1120px, 100%);
          min-height: 680px;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.95fr);
          background: #ffffff;
          border: 1px solid var(--shell-border);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 70px rgba(15, 76, 117, 0.13);
        }

        .auth-brand-panel {
          position: relative;
          padding: 42px;
          background:
            linear-gradient(145deg, #ffffff 0%, #f4f8fc 54%, #e8f2f9 100%);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .auth-brand-panel::after {
          content: '';
          position: absolute;
          inset: auto -20% -22% -20%;
          height: 42%;
          background: linear-gradient(90deg, rgba(187, 225, 250, 0.32), rgba(50, 130, 184, 0.08));
          transform: skewY(-7deg);
        }

        .auth-back {
          position: relative;
          z-index: 1;
          width: fit-content;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: var(--weight-medium);
          line-height: 1;
          transition: color 0.2s;
        }

        .auth-back:hover {
          color: var(--primary);
        }

        .brand-lockup {
          position: relative;
          z-index: 1;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          gap: 42px;
        }

        :global(.auth-logo) {
          width: 214px;
          height: auto;
          filter: drop-shadow(0 10px 20px rgba(15, 76, 117, 0.1));
        }

        .auth-kicker {
          color: var(--accent);
          font-size: 12px;
          font-weight: var(--weight-medium);
          letter-spacing: var(--tracking-caps);
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .auth-title {
          font-family: var(--jakarta);
          color: var(--text-primary);
          font-size: var(--text-display);
          line-height: var(--leading-display);
          letter-spacing: var(--tracking-heading);
          font-weight: var(--weight-semibold);
          max-width: 560px;
        }

        .auth-proof-row {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .auth-proof-row div {
          border-top: 1px solid var(--shell-border);
          padding-top: 16px;
        }

        .auth-proof-row span {
          display: block;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: var(--weight-medium);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .auth-proof-row strong {
          color: var(--text-primary);
          font-size: 15px;
          line-height: 1.25;
        }

        .auth-form-panel {
          min-width: 0;
          padding: 58px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .mobile-auth-header {
          display: none;
        }

        .form-heading {
          margin-bottom: 34px;
        }

        .secure-badge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: var(--primary-dim);
          color: var(--primary);
          font-size: 12px;
          font-weight: var(--weight-medium);
          margin-bottom: 22px;
        }

        .form-heading h2 {
          color: var(--text-primary);
          font-size: 30px;
          line-height: 38px;
          letter-spacing: var(--tracking-heading);
          font-weight: var(--weight-semibold);
          margin-bottom: 10px;
        }

        .form-heading p {
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.55;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-group label {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: var(--weight-medium);
        }

        .field-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .reset-link {
          color: var(--accent);
          font-size: 12px;
          font-weight: var(--weight-medium);
          cursor: pointer;
          min-height: 44px;
          padding: 0 4px;
        }

        .input-wrap {
          height: var(--control-lg);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          background: #f8fafc;
          border: 1px solid var(--shell-border);
          border-radius: var(--radius-control);
          color: var(--text-muted);
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }

        .input-wrap:focus-within {
          background: #ffffff;
          border-color: rgba(50, 130, 184, 0.72);
          box-shadow: 0 0 0 4px rgba(50, 130, 184, 0.1);
        }

        .input-wrap input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text-primary);
          font: inherit;
          font-size: 15px;
          min-width: 0;
        }

        .input-wrap input::placeholder {
          color: rgba(100, 116, 139, 0.62);
        }

        .auth-alert {
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: var(--weight-medium);
          line-height: 1.45;
        }

        .auth-alert.error {
          background: #fff5f4;
          border: 1px solid #ffd4cf;
          color: #b42318;
        }

        .auth-alert.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .auth-submit {
          height: var(--control-lg);
          border-radius: var(--radius-control);
          background: var(--primary);
          color: #ffffff;
          font-size: 14px;
          font-weight: var(--weight-medium);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 16px 34px rgba(15, 76, 117, 0.22);
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #0d4266;
          box-shadow: 0 18px 40px rgba(15, 76, 117, 0.28);
        }

        .auth-divider {
          height: 1px;
          background: var(--shell-border);
          margin: 28px 0 22px;
        }

        .auth-join {
          color: var(--text-muted);
          font-size: 14px;
          text-align: center;
        }

        .auth-join a {
          color: var(--primary);
          font-weight: var(--weight-medium);
        }

        .auth-footnote {
          color: var(--text-faint);
          font-size: 12px;
          text-align: center;
          margin-top: 18px;
          line-height: 1.5;
        }

        @media (max-width: 880px) {
          .auth-shell {
            min-height: 100dvh;
            padding:
              calc(12px + var(--safe-area-top))
              calc(12px + var(--safe-area-right))
              calc(12px + var(--safe-area-bottom))
              calc(12px + var(--safe-area-left));
            align-items: flex-start;
          }

          .auth-frame {
            min-height: auto;
            grid-template-columns: 1fr;
            border-radius: 20px;
          }

          .auth-brand-panel {
            display: none;
          }

          .mobile-auth-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 30px;
            min-width: 0;
          }

          .mobile-auth-back {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--text-muted);
            font-size: 13px;
            font-weight: var(--weight-medium);
          }

          :global(.mobile-auth-logo) {
            display: block;
            flex: 0 0 auto;
            width: 126px;
            max-width: 42%;
            height: auto;
            object-fit: contain;
          }

          .form-heading {
            margin-bottom: 28px;
          }

          .auth-form-panel {
            padding: 24px;
          }

          .form-heading h2 {
            font-size: 28px;
          }

          .input-wrap input {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
