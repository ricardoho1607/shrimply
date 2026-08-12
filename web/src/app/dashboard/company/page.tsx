"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Edit3,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyMembers } from '@/hooks/useDashboardData';

type RoleKey = 'owner' | 'co-owner' | 'manager' | 'technician' | 'admin' | 'buyer' | 'mechanic';

interface CompanyProfile {
  id?: string;
  companyName?: string;
  primaryLocation?: string | { address?: string };
  location?: string;
  farmType?: string;
  businessSize?: string;
  description?: string;
  contactPhone?: string;
  isPublicProfile?: boolean;
  teamMembers?: string[];
}

interface TeamMember {
  id: string;
  email?: string;
  name?: string;
  role?: RoleKey;
  status?: 'active' | 'pending' | 'inactive';
}

interface RoleDefinition {
  title: string;
  description: string;
  permissions: string[];
  icon: React.ComponentType<{ size?: number; color?: string }>;
  maxCount: number;
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  width: '100%',
  minWidth: 0,
  maxWidth: '1180px',
  margin: '0 auto',
};

const panelStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--shell-border)',
  borderRadius: '18px',
  boxShadow: '0 14px 34px rgba(15, 76, 117, 0.06)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  fontFamily: 'var(--jakarta)',
};

const formatLocation = (company: CompanyProfile) => {
  const primaryLocation = company?.primaryLocation;
  if (typeof primaryLocation === 'string') return primaryLocation;
  return company?.location || primaryLocation?.address || 'Not set';
};

const formatBusinessSize = (size?: string) => {
  if (!size) return 'Not set';
  return `${size.charAt(0).toUpperCase()}${size.slice(1)} operation`;
};

const statusColor = (status?: string) => {
  if (status === 'active') return '#16a34a';
  if (status === 'pending') return '#f59e0b';
  return '#94a3b8';
};

export default function CompanyPage() {
  const { company, user } = useAuth();
  const { t } = useLanguage();
  const companyProfile = company as CompanyProfile | null;
  const { data: members, loading: loadingMembers } = useCompanyMembers<TeamMember>();

  const roleDefinitions = useMemo<Record<RoleKey, RoleDefinition>>(() => ({
    owner: {
      title: t.companyDetails?.farmOwner || 'Farm Owner',
      description: t.companyDetails?.fullAccess || 'Full access to company operations and settings.',
      permissions: [
        t.companyDetails?.allPermissions || 'All permissions',
        t.companyDetails?.inviteMembers || 'Invite members',
        t.companyDetails?.manageFinances || 'Manage finances',
        t.companyDetails?.exportData || 'Export data',
      ],
      icon: ShieldCheck,
      maxCount: 1,
    },
    'co-owner': {
      title: t.companyDetails?.coOwner || 'Co-owner',
      description: t.companyDetails?.coOwnerAccess || 'Full access except removing owners and co-owners.',
      permissions: [
        t.companyDetails?.allPermissions || 'All permissions',
        t.companyDetails?.inviteMembers || 'Invite members',
        t.companyDetails?.manageFinances || 'Manage finances',
        t.companyDetails?.exportData || 'Export data',
      ],
      icon: ShieldCheck,
      maxCount: 3,
    },
    manager: {
      title: t.companyDetails?.farmManager || 'Farm Manager',
      description: t.companyDetails?.overseeOperations || 'Oversees day-to-day production workflows.',
      permissions: [
        t.companyDetails?.managePonds || 'Manage ponds',
        t.companyDetails?.viewReports || 'View reports',
        t.companyDetails?.manageHarvest || 'Manage harvest',
        t.companyDetails?.superviseTeam || 'Supervise team',
      ],
      icon: Users,
      maxCount: 3,
    },
    technician: {
      title: t.companyDetails?.aquacultureTechnician || 'Aquaculture Technician',
      description: t.companyDetails?.handsOnManagement || 'Handles pond records, water quality, and feed activity.',
      permissions: [
        t.companyDetails?.addSamplingData || 'Add sampling data',
        t.companyDetails?.monitorWaterQuality || 'Monitor water quality',
        t.companyDetails?.recordFeeding || 'Record feeding',
        t.companyDetails?.basicReports || 'Basic reports',
      ],
      icon: FlaskConical,
      maxCount: 10,
    },
    mechanic: {
      title: t.companyDetails?.mechanic || 'Mechanic',
      description: t.companyDetails?.assetMaintenance || 'Maintains farm assets and service records without editing pond operations.',
      permissions: [
        t.companyDetails?.viewPonds || 'View ponds',
        t.companyDetails?.viewAssetInventory || 'View asset inventory',
        t.companyDetails?.logMaintenance || 'Log maintenance',
        t.companyDetails?.updateServiceRecords || 'Update service records',
      ],
      icon: Wrench,
      maxCount: 8,
    },
    admin: {
      title: t.companyDetails?.systemAdministrator || 'System Administrator',
      description: t.companyDetails?.technicalSupport || 'Supports user access, data hygiene, and system setup.',
      permissions: [
        t.companyDetails?.userManagement || 'User management',
        t.companyDetails?.systemSettings || 'System settings',
        t.companyDetails?.troubleshoot || 'Troubleshoot',
        t.companyDetails?.dataBackup || 'Data backup',
      ],
      icon: Activity,
      maxCount: 2,
    },
    buyer: {
      title: 'Buyer',
      description: 'Purchasing and procurement access.',
      permissions: ['View harvests', 'Monitor farm profiles'],
      icon: UserRound,
      maxCount: 5,
    },
  }), [t]);

  const membersByRole = useMemo(() => {
    return members.reduce((acc, member) => {
      const role = (member.role || 'technician') as RoleKey;
      acc[role] = [...(acc[role] || []), member];
      return acc;
    }, {} as Record<RoleKey, TeamMember[]>);
  }, [members]);

  if (!companyProfile) {
    return (
      <div style={pageStyle}>
        <Link href="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '13px' }}>
          <ArrowLeft size={16} />
          Back to settings
        </Link>
        <div style={{ ...panelStyle, padding: '40px', textAlign: 'center' }}>
          <Building2 size={44} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', fontFamily: 'var(--jakarta)', color: 'var(--text-primary)' }}>No company profile found</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Set up your company profile before using this page.</p>
          <Link href="/dashboard/settings" className="btn-primary" style={{ borderRadius: '12px', padding: '12px 18px' }}>
            Open settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="company-page" style={pageStyle}>
      <div className="company-page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="company-page-heading">
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '13px', marginBottom: '18px' }}>
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <h1 className="company-page-title" style={{ fontSize: '34px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '8px', fontFamily: 'var(--jakarta)', color: 'var(--text-primary)' }}>
            {companyProfile.companyName || t.companyDetails?.title || 'Company Details'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '680px', lineHeight: 1.6 }}>
            {companyProfile.description || 'Company information, organization structure, and public profile details for your aquaculture operation.'}
          </p>
        </div>
        <Link className="company-edit-link" href="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: '#fff', color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
          <Edit3 size={16} />
          Edit details
        </Link>
      </div>

      <section style={{ ...panelStyle, overflow: 'hidden' }}>
        <div className="company-info-header" style={{ padding: '28px 32px', borderBottom: '1px solid var(--shell-border)', display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '58px', height: '58px', borderRadius: '16px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} />
            </div>
            <div>
              <div style={labelStyle}>{t.companyDetails?.companyInformation || 'Company Information'}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>{companyProfile.companyName}</div>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: companyProfile.isPublicProfile ? '#dcfce7' : 'var(--bg-mid)', color: companyProfile.isPublicProfile ? '#166534' : 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
            <CheckCircle2 size={15} />
            {companyProfile.isPublicProfile ? 'Public profile' : 'Private profile'}
          </div>
        </div>

        <div className="company-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1px', background: 'var(--shell-border)' }}>
          {[
            { label: t.companyDetails?.location || 'Location', value: formatLocation(companyProfile), icon: MapPin },
            { label: t.companyDetails?.farmType || 'Farm Type', value: companyProfile.farmType || 'Not specified', icon: Activity },
            { label: t.companyDetails?.businessSize || 'Business Size', value: formatBusinessSize(companyProfile.businessSize), icon: Building2 },
            { label: t.companyDetails?.members || 'Members', value: `${members.length || companyProfile.teamMembers?.length || 0}`, icon: Users },
          ].map((item) => (
            <div key={item.label} style={{ background: '#fff', padding: '22px', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <item.icon size={20} color="var(--primary)" />
              <div>
                <div style={labelStyle}>{item.label}</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px', marginTop: '5px', lineHeight: 1.35 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {(companyProfile.contactPhone || user?.email) && (
          <div style={{ padding: '22px 32px', display: 'flex', flexWrap: 'wrap', gap: '16px 28px', borderTop: '1px solid var(--shell-border)' }}>
            {companyProfile.contactPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>
                <Phone size={16} color="var(--primary)" />
                {companyProfile.contactPhone}
              </div>
            )}
            {user?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>
                <Mail size={16} color="var(--primary)" />
                {user.email}
              </div>
            )}
          </div>
        )}
      </section>

      {(user?.role === 'owner' || user?.role === 'co-owner') && (
        <section className="company-requests-panel" style={{ ...panelStyle, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
          <div className="company-request-copy" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 600, fontFamily: 'var(--jakarta)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Manage join requests in Settings
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Approve or reject pending staff from the Organization tab.
                </p>
              </div>
            </div>
          </div>
          <Link className="company-settings-link" href="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: '#fff', color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
            Open Settings &gt; Organization
          </Link>
        </section>
      )}

      <section className="company-organization-panel" style={{ ...panelStyle, padding: '30px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, fontFamily: 'var(--jakarta)', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {t.companyDetails?.organizationStructure || 'Organization Structure'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {loadingMembers ? 'Loading team members...' : `${members.length} ${t.companyDetails?.members || 'members'}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {(Object.entries(roleDefinitions) as [RoleKey, RoleDefinition][]).map(([roleKey, role]) => {
            const RoleIcon = role.icon;
            const roleMembers = membersByRole[roleKey] || [];
            return (
              <div className="company-role-card" key={roleKey} style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-mid)' }}>
                <div className="company-role-header" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RoleIcon size={20} />
                  </div>
                  <div className="company-role-copy" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>{role.title}</div>
                    <div className="company-role-description" style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{role.description}</div>
                  </div>
                  <div style={{ color: roleMembers.length > 0 ? '#16a34a' : '#94a3b8', fontWeight: 600, fontSize: '13px' }}>
                    {roleMembers.length}/{role.maxCount}
                  </div>
                </div>

                <div className="company-role-body" style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: roleMembers.length ? '1.35fr 1fr' : '1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {roleMembers.length ? roleMembers.map((member: TeamMember) => (
                      <div className="company-member-row" key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: statusColor(member.status) }} />
                        <div className="company-member-copy" style={{ minWidth: 0 }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name || member.email || 'Team member'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>No members assigned yet.</div>
                    )}
                  </div>

                  {roleMembers.length > 0 && (
                    <div className="company-permissions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
                      {role.permissions.map((permission: string) => (
                        <span className="company-permission" key={permission} style={{ padding: '6px 9px', borderRadius: '999px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                          {permission}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 960px) {
          .company-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .company-page {
            gap: 18px !important;
          }

          .company-page-heading {
            min-width: 0;
            width: 100%;
          }

          .company-page-title {
            font-size: 28px !important;
            overflow-wrap: anywhere;
          }

          .company-edit-link,
          .company-settings-link {
            justify-content: center !important;
            width: 100%;
          }

          .company-info-header {
            align-items: flex-start !important;
            padding: 22px 20px !important;
          }

          .company-info-grid {
            grid-template-columns: 1fr !important;
          }

          .company-requests-panel {
            align-items: stretch !important;
            padding: 20px !important;
          }

          .company-request-copy {
            align-items: flex-start !important;
          }

          .company-organization-panel {
            padding: 22px 18px !important;
          }

          .company-role-header {
            align-items: flex-start !important;
            display: grid !important;
            grid-template-columns: 42px minmax(0, 1fr) auto;
            padding: 16px !important;
          }

          .company-role-description {
            line-height: 1.5;
          }

          .company-role-body {
            gap: 14px !important;
            grid-template-columns: minmax(0, 1fr) !important;
            padding: 16px !important;
          }

          .company-member-copy {
            min-width: 0;
          }

          .company-member-copy > div {
            overflow-wrap: anywhere;
            white-space: normal !important;
          }

          .company-permissions {
            border-top: 1px solid var(--border);
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding-top: 14px;
            width: 100%;
          }

          .company-permission {
            align-items: center;
            border-radius: 10px !important;
            display: flex;
            justify-content: center;
            line-height: 1.35;
            min-width: 0;
            overflow-wrap: anywhere;
            text-align: center;
            white-space: normal;
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .company-permissions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
