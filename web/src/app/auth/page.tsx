"use client";

import React, { useEffect, useState } from 'react';
import { LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROUTES } from '@/config/routes';

export default function AuthPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const { signIn, resetPassword, isAuthenticated, needsRoleSelection, needsSetup } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    if (needsRoleSelection) {
      router.replace(ROUTES.roleSelection);
      return;
    }

    if (needsSetup) {
      router.replace(ROUTES.setupChoice);
      return;
    }

    router.replace(ROUTES.dashboard);
  }, [isAuthenticated, needsRoleSelection, needsSetup, router]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await signIn(email, password);
      // Let the layouts handle redirection based on user state
      router.push(ROUTES.dashboard);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.messages.error || 'Failed to login');
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
      setError(err instanceof Error ? err.message : 'Could not send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      background: '#f4f8fc',
      color: 'var(--text-primary)'
    }}>
      

      {/* Noise Overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.18,
        backgroundImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><filter id='noiseFilter'><feTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noiseFilter)'/></svg>\")"
      }} />
      
      {/* Light Glow */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(26,184,232,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{ zIndex: 10, width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'color 0.2s',
          alignSelf: 'flex-start',
          marginBottom: '8px'
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={16} />
          {t.auth.backToHome || 'Back to Home'}
        </Link>

        <div className="glass-card animate-fade-up" style={{
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          background: '#FFFFFF',
          borderRadius: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <img 
              src="/assets/shrimplylogoweb.png" 
              alt="Shrimply" 
              style={{ height: '64px', width: 'auto', margin: '0 auto 20px', filter: 'drop-shadow(0 10px 20px rgba(15,76,117,0.1))' }} 
            />
            <h3 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>
              {t.auth.loginTitle || 'Portal Login'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {t.auth.loginSubtitle || "Access your farm's intelligent command center"}
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="login-email" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginLeft: '4px' }}>
                {t.auth.email || 'Email Address'}
              </label>
              <input 
                id="login-email"
                type="email" 
                autoComplete="email"
                style={{
                  width: '100%',
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  outline: 'none',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(50, 130, 184, 0.08)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <label htmlFor="login-password" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {t.auth.password || 'Password'}
                </label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', cursor: resetLoading ? 'wait' : 'pointer' }}
                >
                  {resetLoading ? 'Sending...' : t.auth.forgotPassword || 'Forgot password?'}
                </button>
              </div>
              <input 
                id="login-password"
                type="password" 
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  outline: 'none',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(50, 130, 184, 0.08)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: 600
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.16)',
                color: '#15803d',
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: 600
              }}>
                {success}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary"
              style={{ padding: '16px', borderRadius: '14px', fontSize: '15px', width: '100%', gap: '10px' }}
            >
              {loading ? (t.auth.authenticating || 'Authenticating...') : (
                <>
                  {t.auth.enterDashboard || 'Enter Dashboard'}
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ position: 'relative', height: '1px', background: 'var(--border)', margin: '8px 0' }}>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {t.auth.portalNote || 'Official Shrimply Portal'}
            </span>
          </div>

          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            {t.auth.noAccount || "Don't have an account?"}{' '}
            <Link href={ROUTES.join} style={{ font: 'inherit', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
              {t.auth.joinUs || 'Join Us'}
            </Link>
          </div>
        </div>
      </div>
      
      <footer style={{ marginTop: '40px', color: 'var(--text-faint)', fontSize: '11px', textAlign: 'center', fontWeight: 500 }}>
        {t.auth.secureNote || 'Securely powered by Firebase Enterprise.'}<br />
        &copy; 2026 Shrimply Tech. {t.auth.rightsReserved || 'All rights reserved.'}
      </footer>
    </main>
  );
}
