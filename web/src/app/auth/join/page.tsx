"use client";

import React, { useState } from 'react';
import { UserPlus, ArrowLeft, ShieldCheck, Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();

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
      await signUp(email, password, name);
      router.push('/roleselection');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
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
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginLeft: '4px'
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
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

      <div style={{ zIndex: 10, width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <Link href="/auth" style={{
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
          Back to Login
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
            <h3 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>Join the Revolution</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Start scaling your farm with Shrimply today.</p>
          </div>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Full Name</label>
              <input 
                type="text" 
                style={inputStyle}
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
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Email Address</label>
              <input 
                type="email" 
                style={inputStyle}
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
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Password</label>
              <input 
                type="password" 
                style={inputStyle}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Confirm Password</label>
              <input 
                type="password" 
                style={inputStyle}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary"
              style={{ padding: '16px', borderRadius: '14px', fontSize: '15px', width: '100%', gap: '10px', marginTop: '8px' }}
            >
              {loading ? 'Creating Account...' : (
                <>
                  Join Shrimply
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/auth" style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
      
      <footer style={{ marginTop: '40px', color: 'var(--text-faint)', fontSize: '11px', textAlign: 'center', fontWeight: 500 }}>
        Securely powered by Firebase Enterprise.<br />
        &copy; 2026 Shrimply Tech. All rights reserved.
      </footer>

      <style jsx>{`
        @media (max-width: 480px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
