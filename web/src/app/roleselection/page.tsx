"use client";

import { useState } from 'react';
import { HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { getRequiredSetupRoute } from '@/config/routes';
import OnboardingProgress from '@/components/OnboardingProgress';

type UserRole = 'owner' | 'co-owner' | 'technician' | 'manager' | 'admin' | 'buyer' | 'mechanic';

type RoleOption = {
  id: UserRole;
  title: string;
  description: string;
  requiresCompany: boolean;
};

export default function RoleSelectionPage() {
  const isReady = useOnboardingGuard('role');
  const { completeRoleSelection, signOut } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const roles: RoleOption[] = [
    {
      id: 'owner',
      title: t.roleSelection.farmOwner || 'Farm Owner',
      description: t.roleSelection.farmOwnerDesc || 'Full control over farm operations, teams, and financial data.',
      requiresCompany: false
    },
    {
      id: 'co-owner',
      title: t.roleSelection.coOwner || 'Co-owner',
      description: t.roleSelection.coOwnerDesc || 'Join an existing farm with owner-level access except removing owners.',
      requiresCompany: true
    },
    {
      id: 'technician',
      title: t.roleSelection.aquacultureTechnician || 'Aquaculture Technician',
      description: t.roleSelection.technicianDesc || 'Focus on water quality monitoring and biological data entry.',
      requiresCompany: true
    },
    {
      id: 'mechanic',
      title: t.roleSelection.mechanic || 'Mechanic',
      description: t.roleSelection.mechanicDesc || 'Maintain farm equipment and asset service records.',
      requiresCompany: true
    },
    {
      id: 'manager',
      title: t.roleSelection.manager || 'Farm Manager',
      description: t.roleSelection.managerDesc || 'Oversee daily operations and coordinate between technicians, owners, and co-owners.',
      requiresCompany: true
    },
    {
      id: 'buyer',
      title: t.roleSelection.shrimpBuyer || 'Shrimp Buyer',
      description: t.roleSelection.buyerDesc || 'Find high-quality shrimp harvests and manage procurement.',
      requiresCompany: false
    },
    {
      id: 'admin',
      title: t.roleSelection.administrator || 'Administrator',
      description: t.roleSelection.adminDesc || 'Manage farm systems, users, and operational access.',
      requiresCompany: true
    }
  ];

  const handleRoleSelect = async (role: RoleOption) => {
    if (loading) return;
    setSelectedRole(role.id);
    setLoading(true);

    try {
      await completeRoleSelection(role.id);
      router.push(getRequiredSetupRoute(role.id));
    } catch (error: unknown) {
      console.error('Role selection failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to set up role');
      setSelectedRole(null);
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

  if (!isReady) return <OnboardingLoading />;

  return (
    <main className="role-selection-shell">
      <OnboardingProgress
        percent={25}
        title={t.onboardingProgress.role}
        detail={t.onboardingProgress.roleDetail}
      />

      <header className="role-selection-header">
        <Image
          src="/assets/logo.webp"
          width="500"
          height="500"
          alt="Shrimply"
          className="role-selection-logo"
          style={{
            display: 'block',
            width: '92px',
            height: '92px',
            margin: '0 auto 8px',
            objectFit: 'contain',
          }}
        />
        <h1>Choose Your Path</h1>
        <p>
          Select the role that best describes your responsibilities. We&apos;ll customize your experience accordingly.
        </p>
      </header>

      <div className="role-grid">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`role-card ${selectedRole === role.id ? 'active' : ''}`}
            onClick={() => handleRoleSelect(role)}
            disabled={loading}
          >
            <span className="role-card-copy">
              <strong>{role.title}</strong>
              <span>{role.description}</span>
            </span>
            <span className="role-card-action">
              {loading && selectedRole === role.id
                ? 'Setting up...'
                : role.requiresCompany ? 'Join a farm' : 'Continue'}
            </span>
          </button>
        ))}
      </div>

      <div className="role-help">
        <div>
          <HelpCircle size={18} />
          <span>Need help choosing?</span>
        </div>
        <p>
          Farm Owners typically create the digital profile for the entire operation. Farm staff, including Administrators, join existing farms using a search or invitation link. Buyers operate independently to source products.
        </p>
      </div>

      <button
        type="button"
        className="role-sign-out"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut size={16} />
        {signingOut ? (t.common.loading || 'Loading...') : (t.sidebar.signOut || 'Sign Out')}
      </button>

      <style jsx>{`
        .role-selection-shell {
          min-height: 100vh;
          background: var(--bg-dark);
          padding: 64px 24px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .role-selection-header {
          width: min(680px, 100%);
          margin: 30px auto 36px;
          text-align: center;
        }
        .role-selection-header h1 {
          margin: 0 0 10px;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .role-selection-header p {
          max-width: 600px;
          margin: 0 auto;
          color: var(--text-muted);
          font-size: 17px;
          line-height: 1.65;
        }
        .role-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          width: min(920px, 100%);
        }
        .role-card {
          min-height: 148px;
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(15, 76, 117, 0.05);
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .role-card:hover {
          border-color: rgba(50, 130, 184, 0.45);
          background: #f8fbfd;
          box-shadow: 0 12px 26px rgba(15, 76, 117, 0.08);
        }
        .role-card:focus-visible {
          outline: 3px solid rgba(50, 130, 184, 0.25);
          outline-offset: 2px;
        }
        .role-card.active {
          border-color: var(--secondary);
          background: #f3f9fc;
        }
        .role-card:disabled {
          cursor: wait;
          opacity: 0.75;
        }
        .role-card-copy {
          display: grid;
          gap: 7px;
        }
        .role-card-copy strong {
          font-size: 18px;
          font-weight: 750;
        }
        .role-card-copy span {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .role-card-action {
          color: var(--primary);
          font-size: 13px;
          font-weight: 700;
        }
        .role-help {
          max-width: 600px;
          margin-top: 42px;
          text-align: center;
        }
        .role-help > div {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
          color: var(--text-muted);
        }
        .role-help span {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .role-help p {
          margin: 0;
          color: var(--text-faint);
          font-size: 13px;
          line-height: 1.6;
        }
        .role-sign-out {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 28px;
          padding: 9px 11px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--text-muted);
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease;
        }
        .role-sign-out:hover {
          background: #fef0ef;
          color: #b42318;
        }
        .role-sign-out:focus-visible {
          outline: 3px solid rgba(180, 35, 24, 0.18);
          outline-offset: 2px;
        }
        .role-sign-out:disabled {
          cursor: wait;
          opacity: 0.6;
        }
        @media (max-width: 640px) {
          .role-selection-shell {
            padding: 52px 16px 28px;
          }
          .role-selection-header {
            margin: 18px auto 26px;
          }
          .role-selection-header h1 {
            font-size: 32px;
          }
          .role-selection-header p {
            max-width: 310px;
            font-size: 15px;
            line-height: 1.55;
          }
          .role-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
          }
          .role-card {
            min-height: 0;
            padding: 17px 18px;
            gap: 12px;
          }
          .role-card-copy strong {
            font-size: 17px;
          }
          .role-help {
            margin-top: 30px;
          }
          .role-sign-out {
            margin-top: 20px;
          }
        }
      `}</style>
    </main>
  );
}
