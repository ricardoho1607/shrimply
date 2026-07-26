"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRequiredSetupRoute, ROUTES } from '@/config/routes';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp, isAuthenticated, needsRoleSelection, needsSetup, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token') || undefined;

  useEffect(() => {
    if (!isAuthenticated) return;

    if (needsRoleSelection) {
      router.replace(ROUTES.roleSelection);
      return;
    }

    if (needsSetup) {
      router.replace(getRequiredSetupRoute(user?.role));
      return;
    }

    router.replace(ROUTES.dashboard);
  }, [isAuthenticated, needsRoleSelection, needsSetup, router, user?.role]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    
    try {
      await signUp(email, password, name, inviteToken);
      router.push(inviteToken ? ROUTES.dashboard : ROUTES.roleSelection);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-frame">
        <section className="auth-brand-panel" aria-label="Shrimply signup">
          <Link href={ROUTES.auth} className="auth-back">
            <ArrowLeft size={16} />
            {t.auth.backToLogin || 'Back to Login'}
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
              <p className="auth-kicker">Shrimply account setup</p>
              <h1 className="auth-title">Create your Shrimply workspace.</h1>
            </div>
          </div>

          <div className="auth-proof-row">
            <div>
              <span>Setup</span>
              <strong>Choose your role</strong>
            </div>
            <div>
              <span>Connect</span>
              <strong>Create or join</strong>
            </div>
            <div>
              <span>Secure</span>
              <strong>Firebase auth</strong>
            </div>
          </div>
        </section>

        <section className="auth-form-panel" aria-label="Create account form">
          <div className="mobile-auth-header">
            <Link href={ROUTES.auth} className="mobile-auth-back">
              <ArrowLeft size={17} />
              {t.auth.backToLogin || 'Back to Login'}
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
              Account setup
            </div>
            <h2>Create account</h2>
            <p>Start with your user profile, then choose how you operate in Shrimply.</p>
          </div>

          <form onSubmit={handleJoin} className="auth-form">
            <div className="field-group">
              <label htmlFor="join-name">Full Name</label>
              <div className="input-wrap">
                <User size={18} />
                <input
                  id="join-name"
                  type="text"
                  autoComplete="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="join-email">Email Address</label>
              <div className="input-wrap">
                <Mail size={18} />
                <input
                  id="join-email"
                  type="email"
                  autoComplete="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="join-password">Password</label>
              <div className="input-wrap">
                <Lock size={18} />
                <input
                  id="join-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="join-confirm-password">Confirm Password</label>
              <div className="input-wrap">
                <Lock size={18} />
                <input
                  id="join-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="auth-alert error" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Creating Account...' : (
                <>
                  Join Shrimply
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider" />

          <div className="auth-join">
            Already have an account?{' '}
            <Link href={inviteToken ? `${ROUTES.auth}?token=${encodeURIComponent(inviteToken)}` : ROUTES.auth}>
              Log in
            </Link>
          </div>

          <p className="auth-footnote">Securely powered by Firebase Enterprise.</p>
        </section>
      </div>

      <style jsx>{`
        .auth-shell {
          min-height: 100dvh;
          background: linear-gradient(180deg, #f8fafc 0%, #eef5fa 100%);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
        }

        .auth-frame {
          width: min(1120px, 100%);
          min-height: 720px;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(400px, 0.95fr);
          background: #ffffff;
          border: 1px solid var(--shell-border);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 70px rgba(15, 76, 117, 0.13);
        }

        .auth-brand-panel {
          position: relative;
          padding: 42px;
          background: linear-gradient(145deg, #ffffff 0%, #f4f8fc 54%, #e8f2f9 100%);
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
          font-weight: 700;
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
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .auth-title {
          font-family: var(--jakarta);
          color: var(--text-primary);
          font-size: clamp(2.35rem, 4vw, 4.4rem);
          line-height: 1.02;
          letter-spacing: 0;
          font-weight: 780;
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
          font-weight: 800;
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
          padding: 52px 58px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .mobile-auth-header {
          display: none;
        }

        .form-heading {
          margin-bottom: 28px;
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
          font-weight: 800;
          margin-bottom: 22px;
        }

        .form-heading h2 {
          color: var(--text-primary);
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: 0;
          font-weight: 820;
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
          gap: 16px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-group label {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 800;
        }

        .input-wrap {
          height: 52px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          background: #f8fafc;
          border: 1px solid var(--shell-border);
          border-radius: 14px;
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
          font-weight: 700;
          line-height: 1.45;
        }

        .auth-alert.error {
          background: #fff5f4;
          border: 1px solid #ffd4cf;
          color: #b42318;
        }

        .auth-submit {
          height: 54px;
          border-radius: 14px;
          background: var(--primary);
          color: #ffffff;
          font-size: 14px;
          font-weight: 850;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 16px 34px rgba(15, 76, 117, 0.22);
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
          margin-top: 4px;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #0d4266;
          box-shadow: 0 18px 40px rgba(15, 76, 117, 0.28);
        }

        .auth-divider {
          height: 1px;
          background: var(--shell-border);
          margin: 24px 0 20px;
        }

        .auth-join {
          color: var(--text-muted);
          font-size: 14px;
          text-align: center;
        }

        .auth-join a {
          color: var(--primary);
          font-weight: 850;
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
            font-weight: 800;
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
            margin-bottom: 26px;
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
