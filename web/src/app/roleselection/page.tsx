"use client";

import React, { useState } from 'react';
import { 
  Building2, 
  FlaskConical, 
  Users, 
  ShoppingCart, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { ROUTES } from '@/config/routes';

type UserRole = 'owner' | 'technician' | 'manager' | 'admin' | 'buyer';

type RoleOption = {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  features: string[];
  requiresCompany: boolean;
};

export default function RoleSelectionPage() {
  const isReady = useOnboardingGuard('role');
  const { completeRoleSelection } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles: RoleOption[] = [
    {
      id: 'owner',
      title: t.roleSelection.farmOwner || 'Farm Owner',
      description: t.roleSelection.farmOwnerDesc || 'Full control over farm operations, teams, and financial data.',
      icon: Building2,
      color: '#0F4C75',
      features: [
        t.roleSelection.ownerFeature1 || 'Create and manage multiple ponds',
        t.roleSelection.ownerFeature2 || 'View financial reports and ROI',
        t.roleSelection.ownerFeature3 || 'Manage team members and invites',
        t.roleSelection.ownerFeature4 || 'Enterprise-level data insights',
      ],
      requiresCompany: false
    },
    {
      id: 'technician',
      title: t.roleSelection.aquacultureTechnician || 'Aquaculture Technician',
      description: t.roleSelection.technicianDesc || 'Focus on water quality monitoring and biological data entry.',
      icon: FlaskConical,
      color: '#3282B8',
      features: [
        t.roleSelection.technicianFeature1 || 'Record water quality parameters',
        t.roleSelection.technicianFeature2 || 'Monitor shrimp health and growth',
        t.roleSelection.technicianFeature3 || 'Feed management and optimization',
        t.roleSelection.technicianFeature4 || 'Real-time biological alerts',
      ],
      requiresCompany: true
    },
    {
      id: 'manager',
      title: t.roleSelection.manager || 'Farm Manager',
      description: t.roleSelection.managerDesc || 'Oversee daily operations and coordinate between technicians and owners.',
      icon: Users,
      color: '#BBE1FA',
      features: [
        t.roleSelection.managerFeature1 || 'Review daily pond performance',
        t.roleSelection.managerFeature2 || 'Coordinate technician schedules',
        t.roleSelection.managerFeature3 || 'Approve inventory requests',
        t.roleSelection.managerFeature4 || 'Operational efficiency reports',
      ],
      requiresCompany: true
    },
    {
      id: 'buyer',
      title: t.roleSelection.shrimpBuyer || 'Shrimp Buyer',
      description: t.roleSelection.buyerDesc || 'Find high-quality shrimp harvests and manage procurement.',
      icon: ShoppingCart,
      color: '#27AE60',
      features: [
        t.roleSelection.buyerFeature1 || 'Access verified farm profiles',
        t.roleSelection.buyerFeature2 || 'Receive harvest notifications',
        t.roleSelection.buyerFeature3 || 'Direct communication with owners',
        t.roleSelection.buyerFeature4 || 'Procurement tracking and history',
      ],
      requiresCompany: false
    }
  ];

  const handleRoleSelect = async (role: RoleOption) => {
    if (loading) return;
    setSelectedRole(role.id);
    setLoading(true);

    try {
      await completeRoleSelection(role.id);
      router.push(ROUTES.setupChoice);
    } catch (error: unknown) {
      console.error('Role selection failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to set up role');
      setSelectedRole(null);
      setLoading(false);
    }
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
      <div style={{ maxWidth: '1000px', width: '100%', textAlign: 'center', marginBottom: '60px' }}>
        <img src="/assets/logo.webp" width="500" height="500" alt="Shrimply" style={{ height: '64px', width: '64px', margin: '0 auto 24px' }} />
        <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Choose Your Path
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Select the role that best describes your responsibilities. We'll customize your experience accordingly.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px',
        width: '100%',
        maxWidth: '1200px'
      }}>
        {roles.map((role) => (
          <div 
            key={role.id}
            className={`glass-card ${selectedRole === role.id ? 'active' : ''}`}
            onClick={() => handleRoleSelect(role)}
            style={{
              padding: '40px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              border: selectedRole === role.id ? `2px solid ${role.color}` : '2px solid transparent',
              boxShadow: selectedRole === role.id ? `0 20px 40px ${role.color}15` : '0 10px 30px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '20px',
              background: `${role.color}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '32px',
              color: role.color
            }}>
              <role.icon size={32} />
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>{role.title}</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '32px' }}>
              {role.description}
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px', flex: 1 }}>
              {role.features.map((feature, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <CheckCircle2 size={16} style={{ color: role.color }} />
                  {feature}
                </li>
              ))}
            </ul>

            <button style={{
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              background: role.color,
              color: '#FFFFFF',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              transition: 'transform 0.2s'
            }}>
              {loading && selectedRole === role.id ? 'Setting up...' : (
                <>
                  Continue as {role.id === 'owner' ? 'Owner' : role.id === 'technician' ? 'Technician' : role.id === 'manager' ? 'Manager' : 'Buyer'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '80px', textAlign: 'center', maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          <HelpCircle size={18} />
          <span style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Need help choosing?</span>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-faint)', lineHeight: 1.6 }}>
          Farm Owners typically create the digital profile for the entire operation. Technicians and Managers join existing farms using a search or invitation link. Buyers operate independently to source products.
        </p>
      </div>

      <style jsx>{`
        .glass-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.1) !important;
        }
        .glass-card.active {
          transform: scale(1.02);
        }
      `}</style>
    </main>
  );
}
