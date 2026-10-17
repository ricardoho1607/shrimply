"use client";
import { getUserErrorMessage } from '@/lib/userError';

import { showAppAlert } from '@/lib/appDialogs';


import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
      href: isBuyer ? ROUTES.setupBuyer : ROUTES.setupCompany,
      action: 'Get Started'
    },
    {
      id: 'join',
      title: isBuyer ? 'Join Existing Company' : 'Join Existing Farm',
      description: isBuyer
        ? 'Connect to an existing procurement or trading company.'
        : 'Join your team by searching for your farm profile.',
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
      showAppAlert(getUserErrorMessage(error, 'Failed to change role'));
      setChangingRole(false);
    }
  };

  if (!isReady) return <OnboardingLoading />;
  if (pendingRequestLoading) return <OnboardingLoading />;
  if (pendingRequest && user?.role !== 'buyer') return <PendingJoinRequestScreen request={pendingRequest} />;

  return (
    <main className="setup-choice-shell">
      <header className="setup-choice-header">
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
        <h1>Finalize Your Setup</h1>
        <p>
          {isBuyer
            ? "Choose how you want to operate as a buyer on Shrimply."
            : "Would you like to create a new farm or join an existing operation?"
          }
        </p>
        <button
          type="button"
          className="change-role-button"
          onClick={handleChangeRole}
          disabled={changingRole}
        >
          <ArrowLeft size={16} />
          {changingRole ? 'Changing role...' : 'Change role'}
        </button>
      </header>

      <div className="setup-choice-grid">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="setup-choice-card"
            onClick={() => router.push(choice.href)}
          >
            <span className="setup-choice-copy">
              <strong>{choice.title}</strong>
              <span>{choice.description}</span>
            </span>
            <span className="setup-choice-action">{choice.action}</span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .setup-choice-shell {
          min-height: 100vh;
          padding: 64px 24px 40px;
          background: var(--bg-dark);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .setup-choice-header {
          width: min(680px, 100%);
          margin-bottom: 30px;
          text-align: center;
        }
        .setup-choice-header h1 {
          margin: 0 0 10px;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .setup-choice-header p {
          max-width: 520px;
          margin: 0 auto;
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.6;
        }
        .change-role-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 14px;
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
        .change-role-button:hover {
          background: var(--primary-dim);
          color: var(--primary);
        }
        .change-role-button:focus-visible,
        .setup-choice-card:focus-visible {
          outline: 3px solid rgba(50, 130, 184, 0.22);
          outline-offset: 2px;
        }
        .change-role-button:disabled {
          cursor: wait;
          opacity: 0.6;
        }
        .setup-choice-grid {
          width: min(900px, 100%);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .setup-choice-card {
          min-height: 148px;
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(15, 76, 117, 0.05);
          color: var(--text-primary);
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .setup-choice-card:hover {
          border-color: rgba(50, 130, 184, 0.45);
          background: #f8fbfd;
          box-shadow: 0 12px 26px rgba(15, 76, 117, 0.08);
        }
        .setup-choice-copy {
          display: grid;
          gap: 7px;
        }
        .setup-choice-copy strong {
          font-size: 18px;
          font-weight: 750;
        }
        .setup-choice-copy > span {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .setup-choice-action {
          color: var(--primary);
          font-size: 13px;
          font-weight: 700;
        }
        @media (max-width: 640px) {
          .setup-choice-shell {
            padding: 52px 16px 28px;
          }
          .setup-choice-header {
            margin-bottom: 24px;
          }
          .setup-choice-header h1 {
            font-size: 32px;
          }
          .setup-choice-header p {
            max-width: 310px;
            font-size: 15px;
            line-height: 1.55;
          }
          .change-role-button {
            margin-top: 10px;
          }
          .setup-choice-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
          }
          .setup-choice-card {
            min-height: 0;
            padding: 17px 18px;
            gap: 12px;
          }
          .setup-choice-copy strong {
            font-size: 17px;
          }
        }
      `}</style>
    </main>
  );
}
