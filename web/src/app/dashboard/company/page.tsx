"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Edit3,
  FlaskConical,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  XCircle,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyMembers } from '@/hooks/useDashboardData';

type RoleKey = 'owner' | 'manager' | 'technician' | 'admin' | 'buyer';

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

interface JoinRequest {
  id: string;
  userName: string;
  userEmail: string;
  requestedRole: 'manager' | 'technician' | 'admin';
  requestedAt?: string;
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
  fontWeight: 850,
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
  const { company, user, getJoinRequests, approveJoinRequest, rejectJoinRequest } = useAuth();
  const { t } = useLanguage();
  const companyProfile = company as CompanyProfile | null;
  const { data: members, loading: loadingMembers } = useCompanyMembers<TeamMember>();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

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

  useEffect(() => {
    if (user?.role !== 'owner' || !companyProfile?.id) return;

    let isMounted = true;
    getJoinRequests()
      .then((requests) => {
        if (isMounted) setJoinRequests(requests);
      })
      .catch((error) => {
        console.error('Error loading join requests:', error);
        if (isMounted) setJoinRequests([]);
      });

    return () => {
      isMounted = false;
    };
  }, [companyProfile?.id, getJoinRequests, user?.role]);

  const handleJoinRequestDecision = async (requestId: string, decision: 'approve' | 'reject') => {
    setProcessingRequestId(requestId);
    try {
      if (decision === 'approve') {
        await approveJoinRequest(requestId);
      } else {
        await rejectJoinRequest(requestId);
      }
      setJoinRequests((requests) => requests.filter((request) => request.id !== requestId));
    } catch (error: unknown) {
      console.error('Error processing join request:', error);
      alert(error instanceof Error ? error.message : 'Failed to process join request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (!companyProfile) {
    return (
      <div style={pageStyle}>
        <Link href="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 800, fontSize: '13px' }}>
          <ArrowLeft size={16} />
          Back to settings
        </Link>
        <div style={{ ...panelStyle, padding: '40px', textAlign: 'center' }}>
          <Building2 size={44} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 850, marginBottom: '8px', fontFamily: 'var(--jakarta)', color: 'var(--text-primary)' }}>No company profile found</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Set up your company profile before using this page.</p>
          <Link href="/dashboard/settings" className="btn-primary" style={{ borderRadius: '12px', padding: '12px 18px' }}>
            Open settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 800, fontSize: '13px', marginBottom: '18px' }}>
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <h1 style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '8px', fontFamily: 'var(--jakarta)', color: 'var(--text-primary)' }}>
            {companyProfile.companyName || t.companyDetails?.title || 'Company Details'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '680px', lineHeight: 1.6 }}>
            {companyProfile.description || 'Company information, organization structure, and public profile details for your aquaculture operation.'}
          </p>
        </div>
        <Link href="/dashboard/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: '#fff', color: 'var(--primary)', fontSize: '13px', fontWeight: 850 }}>
          <Edit3 size={16} />
          Edit details
        </Link>
      </div>

      <section style={{ ...panelStyle, overflow: 'hidden' }}>
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--shell-border)', display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '58px', height: '58px', borderRadius: '16px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} />
            </div>
            <div>
              <div style={labelStyle}>{t.companyDetails?.companyInformation || 'Company Information'}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 850, marginTop: '4px' }}>{companyProfile.companyName}</div>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '999px', background: companyProfile.isPublicProfile ? '#dcfce7' : 'var(--bg-mid)', color: companyProfile.isPublicProfile ? '#166534' : 'var(--text-muted)', fontSize: '12px', fontWeight: 850 }}>
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
                <div style={{ color: 'var(--text-primary)', fontWeight: 850, fontSize: '15px', marginTop: '5px', lineHeight: 1.35 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {(companyProfile.contactPhone || user?.email) && (
          <div style={{ padding: '22px 32px', display: 'flex', flexWrap: 'wrap', gap: '16px 28px', borderTop: '1px solid var(--shell-border)' }}>
            {companyProfile.contactPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px' }}>
                <Phone size={16} color="var(--primary)" />
                {companyProfile.contactPhone}
              </div>
            )}
            {user?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px' }}>
                <Mail size={16} color="var(--primary)" />
                {user.email}
              </div>
            )}
          </div>
        )}
      </section>

      {user?.role === 'owner' && (
        <section style={{ ...panelStyle, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 900, fontFamily: 'var(--jakarta)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Pending Join Requests
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Review staff waiting to join this company.
                </p>
              </div>
            </div>
          </div>

          {joinRequests.length === 0 && (
            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-mid)', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 750 }}>
              No pending join requests.
            </div>
          )}

          {joinRequests.map((request) => (
            <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '16px', background: 'var(--bg-mid)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: '#fff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>
                {(request.userName?.[0] || request.userEmail?.[0] || 'U').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '14px' }}>{request.userName || request.userEmail}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '3px' }}>{request.userEmail} • {roleDefinitions[request.requestedRole]?.title || request.requestedRole}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={processingRequestId === request.id}
                  onClick={() => handleJoinRequestDecision(request.id, 'reject')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #FECDCA', background: '#FEF3F2', color: '#B42318', fontWeight: 850, cursor: processingRequestId === request.id ? 'not-allowed' : 'pointer' }}
                >
                  <XCircle size={15} />
                  Reject
                </button>
                <button
                  type="button"
                  disabled={processingRequestId === request.id}
                  onClick={() => handleJoinRequestDecision(request.id, 'approve')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #BBE1FA', background: 'var(--primary)', color: '#FFFFFF', fontWeight: 850, cursor: processingRequestId === request.id ? 'not-allowed' : 'pointer' }}
                >
                  {processingRequestId === request.id ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
                  Approve
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section style={{ ...panelStyle, padding: '30px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--jakarta)', color: 'var(--text-primary)', marginBottom: '4px' }}>
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
              <div key={roleKey} style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-mid)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RoleIcon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 900 }}>{role.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{role.description}</div>
                  </div>
                  <div style={{ color: roleMembers.length > 0 ? '#16a34a' : '#94a3b8', fontWeight: 900, fontSize: '13px' }}>
                    {roleMembers.length}/{role.maxCount}
                  </div>
                </div>

                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: roleMembers.length ? '1.35fr 1fr' : '1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {roleMembers.length ? roleMembers.map((member: TeamMember) => (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: statusColor(member.status) }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 850, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name || member.email || 'Team member'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.email}</div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}>No members assigned yet.</div>
                    )}
                  </div>

                  {roleMembers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
                      {role.permissions.map((permission: string) => (
                        <span key={permission} style={{ padding: '6px 9px', borderRadius: '999px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800 }}>
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
          .company-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
