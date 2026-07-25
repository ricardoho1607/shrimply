"use client";

import React from 'react';
import { Building2, Search, ArrowLeft, ArrowRight, Rocket, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { ROUTES } from '@/config/routes';
import { PendingJoinRequestScreen, usePendingJoinRequest } from '@/components/PendingJoinRequestScreen';

export default function SetupChoicePage() {
  const isReady = useOnboardingGuard('setup');
  const { user, resetRoleSelection } = useAuth();
  const router = useRouter();
  const { pendingRequest, loading: pendingRequestLoading } = usePendingJoinRequest(user?.uid);
  const [changingRole, setChangingRole] = React.useState(false);

  const isBuyer = user?.role === 'buyer';
  const isStaffRole = ['co-owner', 'manager', 'technician', 'admin', 'mechanic'].includes(user?.role || '');

  const choices = [
    {
      id: 'new',
      title: isBuyer ? 'Register New Business' : 'Create New Farm',
      description: isBuyer 
        ? 'Start a new buyer profile to begin sourcing shrimp harvests.' 
        : 'Set up a new digital profile for your farm and ponds.',
      icon: isBuyer ? Rocket : Building2,
      color: isBuyer ? '#27AE60' : '#0F4C75',
      href: isBuyer ? ROUTES.setupBuyer : ROUTES.setupCompany,
      action: 'Get Started'
    },
    {
      id: 'join',
      title: isBuyer ? 'Join Existing Company' : 'Join Existing Farm',
      description: isBuyer
        ? 'Connect to an existing procurement or trading company.'
        : 'Join your team by searching for your farm profile.',
      icon: isBuyer ? UserPlus : Search,
      color: '#3282B8',
      href: ROUTES.setupSearch,
      action: 'Find Company'
    }
  ].filter((choice) => {
    if (isBuyer) return choice.id === 'new';
    if (isStaffRole) return choice.id === 'join';
    return choice.id === 'new';
  });

  const handleChangeRole = async () => {
    if (changingRole) return;
    setChangingRole(true);

    try {
      await resetRoleSelection();
      router.replace(ROUTES.roleSelection);
    } catch (error: unknown) {
      console.error('Failed to change role:', error);
      alert(error instanceof Error ? error.message : 'Failed to change role');
      setChangingRole(false);
    }
  };

  if (!isReady) return <OnboardingLoading />;
  if (pendingRequestLoading) return <OnboardingLoading />;
  if (pendingRequest && user?.role !== 'buyer') return <PendingJoinRequestScreen request={pendingRequest} />;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '80px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center', marginBottom: '60px' }}>
        <button
          type="button"
          onClick={handleChangeRole}
          disabled={changingRole}
          style={{
            margin: '0 auto 28px',
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
            cursor: changingRole ? 'not-allowed' : 'pointer',
            opacity: changingRole ? 0.7 : 1,
            boxShadow: '0 10px 24px rgba(15, 76, 117, 0.08)'
          }}
        >
          <ArrowLeft size={16} />
          {changingRole ? 'Changing role...' : 'Change role'}
        </button>
        <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Finalize Your Setup
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
          {isBuyer 
            ? "Choose how you want to operate as a buyer on Shrimply."
            : "Would you like to create a new farm or join an existing operation?"
          }
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
        gap: '32px',
        width: '100%',
        maxWidth: '900px'
      }}>
        {choices.map((choice) => (
          <div 
            key={choice.id}
            className="glass-card"
            onClick={() => router.push(choice.href)}
            style={{
              padding: '48px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              border: '1px solid var(--border)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{
              width: '80px', height: '80px',
              borderRadius: '24px',
              background: `${choice.color}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '32px',
              color: choice.color
            }}>
              <choice.icon size={40} />
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>{choice.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '40px', flex: 1 }}>
              {choice.description}
            </p>

            <button style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: choice.color,
              color: '#FFFFFF',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer'
            }}>
              {choice.action}
              <ArrowRight size={18} />
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .glass-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.1) !important;
          border-color: var(--primary) !important;
        }
      `}</style>
    </main>
  );
}
