"use client";

import React, { useState } from 'react';
import { ShoppingCart, UserCheck, ShieldCheck, Phone, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { BUYER_INTEREST_OPTIONS } from '@/config/business';
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
    formData.interests.length > 0,
  ]);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

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
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '80px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <OnboardingProgress
        percent={setupProgress}
        title={t.onboardingProgress.buyer}
        detail={t.onboardingProgress.buyerDetail}
      />
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={() => router.push(ROUTES.setupChoice)}
            style={{
              padding: '12px 16px',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-primary)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(15, 76, 117, 0.08)'
            }}
          >
            <ArrowLeft size={16} />
            Back to setup options
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              padding: '12px 16px',
              borderRadius: '999px',
              border: '1px solid #FECDCA',
              background: '#FEF3F2',
              color: '#B42318',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            <LogOut size={16} />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'var(--gradient-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--primary)'
        }}>
          <ShoppingCart size={40} />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
          Buyer Verification
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
          Complete your profile to start connecting with verified shrimp farms.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        maxWidth: '600px',
        width: '100%',
        background: '#FFFFFF',
        padding: '48px',
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
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

        <div>
          <label style={labelStyle}>Sourcing Interests</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {BUYER_INTEREST_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  border: '1px solid',
                  borderColor: formData.interests.includes(option) ? 'var(--primary)' : 'var(--border)',
                  background: formData.interests.includes(option) ? 'var(--primary-dim)' : 'transparent',
                  color: formData.interests.includes(option) ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          padding: '20px',
          background: 'rgba(39, 174, 96, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(39, 174, 96, 0.1)',
          display: 'flex',
          gap: '12px'
        }}>
          <ShieldCheck size={24} style={{ color: '#27AE60', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: '#1B262C', lineHeight: 1.5 }}>
            <b>Verified Buyer Status:</b> By completing this setup, you agree to Shrimply&apos;s terms for procurement. Farms will see your business details when you contact them.
          </p>
        </div>

        <button 
          type="submit"
          disabled={loading}
          style={{
            marginTop: '12px',
            padding: '18px',
            borderRadius: '16px',
            background: '#27AE60',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(39, 174, 96, 0.2)'
          }}
        >
          {loading ? 'Processing...' : (
            <>
              Complete Verification
              <UserCheck size={20} />
            </>
          )}
        </button>
      </form>
    </main>
  );
}
