"use client";

import React, { useState } from 'react';
import { Phone, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { ROUTES } from '@/config/routes';
import { useLanguage } from '@/contexts/LanguageContext';
import OnboardingProgress from '@/components/OnboardingProgress';
import { getBuyerSetupProgress } from '../../../../../shared/onboarding';

export default function BuyerSetupPage() {
  const isReady = useOnboardingGuard('setup');
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    region: '',
    interests: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const setupProgress = getBuyerSetupProgress([
    Boolean(formData.businessName.trim()),
    Boolean(formData.phone.trim()),
    Boolean(formData.region.trim()),
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // Create a company record for the buyer so they can post requirements
      const companyRef = doc(db, 'companies', user.uid);
      const companyData = {
        id: user.uid,
        companyName: formData.businessName,
        businessType: 'Shrimp Buyer',
        farmType: 'buyer',
        primaryLocation: formData.region,
        country: formData.region,
        businessSize: 'medium',
        description: '',
        contactPhone: formData.phone,
        ownerId: user.uid,
        teamMembers: [user.uid],
        pendingInvites: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublicProfile: true
      };

      await setDoc(companyRef, companyData);
      await updateDoc(doc(db, 'users', user.uid), {
        companyId: user.uid,
        hasCompletedSetup: true,
        lastActive: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', user.uid), {
        businessName: formData.businessName,
        phone: formData.phone,
        region: formData.region,
        interests: formData.interests,
        lastActive: serverTimestamp(),
      });
      
      router.push(ROUTES.dashboard);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
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
    marginLeft: '4px',
    display: 'block',
    marginBottom: '8px'
  };

  if (!isReady) return <OnboardingLoading />;

  return (
    <main className="buyer-setup-shell">
      <OnboardingProgress
        percent={setupProgress}
        title={t.onboardingProgress.buyer}
        detail={t.onboardingProgress.buyerDetail}
      />
      <header className="buyer-setup-header">
        <Image
          src="/assets/logo.webp"
          width={500}
          height={500}
          alt="Shrimply"
          style={{
            display: 'block',
            width: '72px',
            height: '72px',
            margin: '0 auto 5px',
            objectFit: 'contain',
          }}
        />
        <h1>Buyer Verification</h1>
        <p>
          Complete your profile to start connecting with verified shrimp farms.
        </p>
        <button
          type="button"
          className="buyer-setup-back"
          onClick={() => router.push(ROUTES.setupChoice)}
        >
          <ArrowLeft size={16} />
          Back to setup options
        </button>
      </header>

      <form className="buyer-setup-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="buyer-business-name" style={labelStyle}>Business/Company Name</label>
          <input 
            id="buyer-business-name"
            style={inputStyle}
            placeholder="e.g. Seafood International"
            value={formData.businessName}
            onChange={e => setFormData({...formData, businessName: e.target.value})}
            required
          />
        </div>

        <div>
          <label htmlFor="buyer-phone" style={labelStyle}>Contact Phone</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input 
              id="buyer-phone"
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="+62 812..."
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="buyer-region" style={labelStyle}>Primary Sourcing Region</label>
          <input 
            id="buyer-region"
            style={inputStyle}
            placeholder="e.g. Southeast Asia / Indonesia"
            value={formData.region}
            onChange={e => setFormData({...formData, region: e.target.value})}
            required
          />
        </div>

        <div className="buyer-verification-note">
          <strong>Verified buyer profile</strong>
          <p>Your business details will be visible to farms when you contact them.</p>
        </div>

        <button
          type="submit"
          className="buyer-setup-submit"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Complete Verification'}
        </button>
      </form>

      <button
        type="button"
        className="buyer-setup-sign-out"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut size={16} />
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </button>

      <style jsx>{`
        .buyer-setup-shell {
          min-height: 100vh;
          padding: 64px 24px 40px;
          background: var(--bg-dark);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .buyer-setup-header {
          width: min(600px, 100%);
          margin: 24px auto 30px;
          text-align: center;
        }
        .buyer-setup-header h1 {
          margin: 0 0 10px;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .buyer-setup-header p {
          max-width: 460px;
          margin: 0 auto;
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.6;
        }
        .buyer-setup-back,
        .buyer-setup-sign-out {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 11px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--text-muted);
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease;
        }
        .buyer-setup-back {
          margin-top: 14px;
        }
        .buyer-setup-back:hover {
          background: var(--primary-dim);
          color: var(--primary);
        }
        .buyer-setup-sign-out {
          margin-top: 20px;
        }
        .buyer-setup-sign-out:hover {
          background: #fef0ef;
          color: #b42318;
        }
        .buyer-setup-back:focus-visible,
        .buyer-setup-sign-out:focus-visible,
        .buyer-setup-submit:focus-visible {
          outline: 3px solid rgba(50, 130, 184, 0.22);
          outline-offset: 2px;
        }
        .buyer-setup-sign-out:disabled,
        .buyer-setup-submit:disabled {
          cursor: wait;
          opacity: 0.65;
        }
        .buyer-setup-form {
          width: min(600px, 100%);
          padding: 48px;
          border: 1px solid var(--border);
          border-radius: 28px;
          background: #fff;
          box-shadow: 0 16px 42px rgba(15, 76, 117, 0.06);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .buyer-verification-note {
          margin-top: 8px;
          padding: 14px 16px;
          border: 1px solid rgba(39, 174, 96, 0.12);
          border-radius: 14px;
          background: rgba(39, 174, 96, 0.05);
        }
        .buyer-verification-note strong {
          display: block;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 750;
        }
        .buyer-verification-note p {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.55;
        }
        .buyer-setup-submit {
          min-height: 52px;
          margin-top: 4px;
          padding: 14px 18px;
          border: 0;
          border-radius: 14px;
          background: var(--primary);
          box-shadow: 0 10px 20px rgba(15, 76, 117, 0.18);
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: background 160ms ease, transform 160ms ease;
        }
        .buyer-setup-submit:hover:not(:disabled) {
          background: #0b3f62;
          transform: translateY(-1px);
        }
        @media (max-width: 640px) {
          .buyer-setup-shell {
            padding: 52px 16px 28px;
          }
          .buyer-setup-header {
            margin: 18px auto 24px;
          }
          .buyer-setup-header h1 {
            font-size: 32px;
          }
          .buyer-setup-header p {
            max-width: 310px;
            font-size: 15px;
            line-height: 1.55;
          }
          .buyer-setup-back {
            margin-top: 10px;
          }
          .buyer-setup-form {
            padding: 26px 20px;
            border-radius: 22px;
          }
        }
      `}</style>
    </main>
  );
}
