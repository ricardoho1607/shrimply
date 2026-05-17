"use client";

import React, { useState, useEffect } from 'react';
import {
  User, 
  Building2, 
  ShieldCheck, 
  Bell, 
  CreditCard,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  Mail,
  Users,
  Globe,
  Languages,
  Info,
  ArrowUpRight,
  Clock,
  XCircle
} from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency, CURRENCIES } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyMembers } from '@/hooks/useDashboardData';

const settingsShellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  maxWidth: '1120px',
  margin: '0 auto',
  fontFamily: 'var(--jakarta), sans-serif',
};

const categoryRailStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '8px',
  borderRadius: '18px',
  background: '#fff',
  border: '1px solid var(--shell-border)',
  boxShadow: '0 10px 30px rgba(15, 76, 117, 0.04)',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  fontFamily: 'var(--jakarta)',
};

const controlStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--bg-mid)',
  outline: 'none',
  color: 'var(--text-primary)',
  fontWeight: 650,
  fontSize: '14px',
  fontFamily: 'var(--jakarta)',
  width: '100%',
};

const getLocationValue = (company: any) => {
  const primaryLocation = company?.primaryLocation;
  if (typeof primaryLocation === 'string') return primaryLocation;
  return company?.location || primaryLocation?.address || '';
};

export default function SettingsPage() {
  const { user, company, getJoinRequests, approveJoinRequest, rejectJoinRequest } = useAuth();
  const { data: members } = useCompanyMembers<any>();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [joinRequests, setJoinRequests] = useState<Array<{
    id: string;
    userName: string;
    userEmail: string;
    requestedRole: string;
    requestedAt?: string;
  }>>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const { currentLanguage, setLanguage, t } = useLanguage();
  const { currentCurrency, setCurrency, autoSyncEnabled, setAutoSyncEnabled } = useCurrency();

  const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
    { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' }
  ];

  // Form States
  const [userForm, setUserForm] = useState({ name: '', phone: '' });
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    farmType: '',
    location: '',
    businessSize: 'medium',
    description: '',
    contactPhone: '',
    isPublicProfile: true,
  });

  useEffect(() => {
    if (user) {
      setUserForm({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user?.name, user?.phone]);

  useEffect(() => {
    if (!company) return;
    setCompanyForm({ 
      companyName: company.companyName || '', 
      farmType: company.farmType || '', 
      location: getLocationValue(company),
      businessSize: company.businessSize || 'medium',
      description: company.description || '',
      contactPhone: company.contactPhone || '',
      isPublicProfile: company.isPublicProfile ?? true,
    });
  }, [company]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab !== 'organization' || user?.role !== 'owner' || !company) {
      return;
    }

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
  }, [activeTab, company, getJoinRequests, user?.role]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    try {
      if (activeTab === 'profile') {
        await updateDoc(doc(db, 'users', user.uid), {
          name: userForm.name,
          phone: userForm.phone
        });
      } else if (activeTab === 'company') {
        const targetCompanyId = company?.id || user.companyId || user.uid;

        const companyData = {
          companyName: companyForm.companyName,
          farmType: companyForm.farmType || (user.role === 'buyer' ? 'Shrimp Buyer' : 'Shrimp Farm'),
          location: companyForm.location,
          primaryLocation: companyForm.location,
          businessSize: companyForm.businessSize,
          description: companyForm.description,
          contactPhone: companyForm.contactPhone,
          isPublicProfile: companyForm.isPublicProfile,
          ownerId: user.uid,
          updatedAt: new Date().toISOString()
        };

        if (!company?.id && !user.companyId) {
          // Create new company record if missing
          const { setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'companies', targetCompanyId), {
            ...companyData,
            id: targetCompanyId,
            teamMembers: [user.uid],
            createdAt: serverTimestamp(),
          });
          
          // Link it to the user
          await updateDoc(doc(db, 'users', user.uid), {
            companyId: targetCompanyId
          });
        } else {
          // Update existing company record
          await updateDoc(doc(db, 'companies', targetCompanyId), companyData);
        }
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-shell" style={settingsShellStyle}>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0 }}>
        {t.settings.manageProfile || 'Manage your personal profile and farm configurations.'}
      </p>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '248px 1fr', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Sidebar Tabs */}
        <div style={categoryRailStyle}>
          {[
            { id: 'profile', label: t.settings.personalProfile || 'Personal Profile', icon: User },
            { id: 'company', label: t.companyDetails.title || 'Company Profile', icon: Building2 },
            { id: 'organization', label: t.companyDetails.organizationStructure || 'Organization', icon: Users },
            { id: 'preferences', label: t.settings.preferences || 'Preferences', icon: Globe },
            { id: 'notifications', label: t.settings.notifications || 'Notifications', icon: Bell },
            { id: 'billing', label: t.settings.billingPlans || 'Billing & Plans', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px',
                border: 'none', background: activeTab === tab.id ? 'var(--primary-dim)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 800 : 650, fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--jakarta)',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-card settings-panel" style={{ padding: '32px', borderRadius: '18px' }}>
          
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, color: 'var(--primary)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {user?.profileImage ? <img src={user.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <button type="button" style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#FFF', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}>
                    <Camera size={14} />
                  </button>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{userForm.name || t.settings.fullName || 'Your Name'}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{t.settings.fullName || 'Full Name'}</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                    <input 
                      value={userForm.name} 
                      onChange={e => setUserForm({...userForm, name: e.target.value})}
                      style={{ ...controlStyle, paddingLeft: '40px' }}
                    />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{t.settings.phoneNumber || 'Phone Number'}</label>
                  <input 
                    value={userForm.phone} 
                    onChange={e => setUserForm({...userForm, phone: e.target.value})}
                    placeholder="+62 812..."
                    style={controlStyle}
                  />
                </div>
                <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>{t.auth.email || 'Email Address'}</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                    <input disabled value={user?.email} style={{ ...controlStyle, paddingLeft: '40px', cursor: 'not-allowed', opacity: 0.6 }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{t.settings.emailHelp || 'Email cannot be changed manually. Contact support for assistance.'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                {success && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13px', fontWeight: 700 }}><CheckCircle2 size={16} /> {t.settings.changesSaved || 'Changes saved'}</div>}
                <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {t.settings.saveChanges || 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'company' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                  <Building2 size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{companyForm.companyName || t.companyDetails.title || 'Company Profile'}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.settings.orgSettings || 'Organization and farm-wide settings.'}</p>
                </div>
                </div>
                <Link href="/dashboard/company" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--primary)', fontSize: '13px', fontWeight: 800, background: '#fff' }}>
                  View profile
                  <ArrowUpRight size={16} />
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>{t.companyDetails.companyName || 'Company Name'}</label>
                  <input 
                    value={companyForm.companyName} 
                    onChange={e => setCompanyForm({...companyForm, companyName: e.target.value})}
                    style={controlStyle}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{t.settings.farmType || 'Farm Type'}</label>
                  <select 
                    value={companyForm.farmType} 
                    onChange={e => setCompanyForm({...companyForm, farmType: e.target.value})}
                    style={controlStyle}
                  >
                    <option value="Shrimp Farm">Shrimp Farm</option>
                    <option value="Hatchery">Hatchery</option>
                    <option value="Processing Plant">Processing Plant</option>
                    <option value="Consultancy">Consultancy</option>
                    <option value="Shrimp Buyer">Shrimp Buyer</option>
                    <option value="Individual Buyer">Individual Buyer</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{t.companyDetails.location || 'Location (Region)'}</label>
                  <input 
                    value={companyForm.location} 
                    onChange={e => setCompanyForm({...companyForm, location: e.target.value})}
                    placeholder={t.companySetup.locationPlaceholder || "e.g. Banyuwangi, East Java"}
                    style={controlStyle}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{t.companyDetails.businessSize || 'Business Size'}</label>
                  <select
                    value={companyForm.businessSize}
                    onChange={e => setCompanyForm({...companyForm, businessSize: e.target.value})}
                    style={controlStyle}
                  >
                    <option value="small">{t.companyDetails.small || 'Small'} operation</option>
                    <option value="medium">{t.companyDetails.medium || 'Medium'} operation</option>
                    <option value="large">{t.companyDetails.large || 'Large'} operation</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Contact Phone</label>
                  <input
                    value={companyForm.contactPhone}
                    onChange={e => setCompanyForm({...companyForm, contactPhone: e.target.value})}
                    placeholder="+62 812..."
                    style={controlStyle}
                  />
                </div>
                <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>{t.companyDetails.description || 'Description'}</label>
                  <textarea
                    value={companyForm.description}
                    onChange={e => setCompanyForm({...companyForm, description: e.target.value})}
                    placeholder="Tell buyers and team members about this operation."
                    style={{ ...controlStyle, minHeight: '110px', resize: 'vertical', lineHeight: 1.55 }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '14px', background: 'var(--bg-mid)', border: '1px solid var(--border)', gridColumn: '1 / -1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={companyForm.isPublicProfile}
                    onChange={e => setCompanyForm({...companyForm, isPublicProfile: e.target.checked})}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>
                    <span style={{ display: 'block', fontWeight: 800, color: 'var(--text-primary)', fontSize: '14px' }}>{t.companySetup.publicProfile || 'Public Profile'}</span>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{t.companySetup.publicProfileDescription || 'Allow shrimp buyers to discover and contact your farm'}</span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                {success && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13px', fontWeight: 700 }}><CheckCircle2 size={16} /> {t.settings.updatedSuccessfully || 'Updated successfully'}</div>}
                <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {t.settings.updateOrganization || 'Update Organization'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'organization' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Team Members</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your organization&apos;s members and their roles.</p>
                </div>
                <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}>+ Invite Member</button>
              </div>

              {user?.role === 'owner' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={18} color="var(--primary)" />
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>Pending join requests</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>Approve staff waiting to join this company.</p>
                      </div>
                    </div>
                  </div>

                  {joinRequests.length === 0 && (
                    <div style={{ padding: '14px', borderRadius: '12px', background: '#FFFFFF', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 650 }}>
                      No pending join requests.
                    </div>
                  )}

                  {joinRequests.map((request) => (
                    <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid var(--border)' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 900 }}>
                        {(request.userName?.[0] || request.userEmail?.[0] || 'U').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 850, color: 'var(--text-primary)' }}>{request.userName || request.userEmail}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{request.userEmail} • {request.requestedRole}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          disabled={processingRequestId === request.id}
                          onClick={() => handleJoinRequestDecision(request.id, 'reject')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #FECDCA', background: '#FEF3F2', color: '#B42318', fontWeight: 800, cursor: 'pointer' }}
                        >
                          <XCircle size={15} />
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={processingRequestId === request.id}
                          onClick={() => handleJoinRequestDecision(request.id, 'approve')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #BBE1FA', background: 'var(--primary)', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {processingRequestId === request.id ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {members.map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px', background: 'var(--bg-mid)', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '18px', border: '1px solid var(--border)' }}>
                      {member.profileImage ? <img src={member.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /> : (member.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{member.name}</span>
                        {member.id === user?.uid && <span style={{ padding: '2px 8px', borderRadius: '100px', background: 'white', border: '1px solid var(--border)', fontSize: '10px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>You</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {member.email}</span>
                        {member.phone && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• {member.phone}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{member.role || 'Member'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{member.id === company?.ownerId ? (t.roleSelection?.farmOwner || 'Owner') : (t.roleSelection?.manager || 'Staff')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{t.settings.regionDisplay || 'Region & Display'}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.settings.regionDisplaySubtitle || 'Customize your language and currency preferences.'}</p>
              </div>

              {/* Language Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
                  <Languages size={20} />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{t.settings.appLanguage || 'App Language'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      style={{
                        padding: '16px', borderRadius: '16px', border: '1px solid',
                        borderColor: currentLanguage === lang.code ? 'var(--primary)' : 'var(--border)',
                        background: currentLanguage === lang.code ? 'var(--primary-dim)' : 'var(--bg-mid)',
                        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{lang.flag}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: currentLanguage === lang.code ? 'var(--primary)' : 'var(--text-primary)' }}>{lang.nativeName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lang.name}</div>
                      </div>
                      {currentLanguage === lang.code && <CheckCircle2 size={18} color="var(--primary)" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
                    <CreditCard size={20} />
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{t.settings.displayCurrency || 'Display Currency'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}>
                    <div style={{ 
                      width: '40px', height: '20px', borderRadius: '20px', 
                      background: autoSyncEnabled ? 'var(--primary)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.3s'
                    }}>
                      <div style={{ 
                        width: '16px', height: '16px', borderRadius: '50%', background: '#FFF',
                        position: 'absolute', top: '2px', left: autoSyncEnabled ? '22px' : '2px',
                        transition: 'left 0.3s'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{t.settings.autoSync || 'Auto-sync with Language'}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {Object.values(CURRENCIES).map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => setCurrency(curr.code as any)}
                      style={{
                        padding: '16px', borderRadius: '16px', border: '1px solid',
                        borderColor: currentCurrency === curr.code ? 'var(--primary)' : 'var(--border)',
                        background: currentCurrency === curr.code ? 'var(--primary-dim)' : 'var(--bg-mid)',
                        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{curr.flag}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: currentCurrency === curr.code ? 'var(--primary)' : 'var(--text-primary)' }}>{curr.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{curr.symbol} ({curr.code})</div>
                      </div>
                      {currentCurrency === curr.code && <CheckCircle2 size={18} color="var(--primary)" />}
                    </button>
                  ))}
                </div>
                <div style={{ 
                  padding: '16px', borderRadius: '12px', background: 'var(--primary-dim)', 
                  border: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'flex-start' 
                }}>
                  <Info size={18} color="var(--primary)" style={{ marginTop: '2px' }} />
                  <p style={{ fontSize: '12px', color: 'var(--primary)', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                    <strong>{t.settings.currencyNote || 'Note'}:</strong> {t.settings.currencyWarning || 'Changing currency only updates the display symbol and formatting. Numeric values in your database remain unchanged.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'notifications' || activeTab === 'billing') && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--text-faint)' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{t.settings.comingSoon || 'Coming Soon'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>
                {t.settings.comingSoonSubtitle ? String(t.settings.comingSoonSubtitle).replace('{tab}', activeTab) : `Advanced ${activeTab} settings are currently being ported to the web interface.`}
              </p>
            </div>
          )}

        </div>
      </div>
      <style jsx>{`
        .settings-shell,
        .settings-shell :global(input),
        .settings-shell :global(select),
        .settings-shell :global(textarea),
        .settings-shell :global(button),
        .settings-shell :global(a),
        .settings-shell :global(label),
        .settings-shell :global(p),
        .settings-shell :global(span),
        .settings-shell :global(div),
        .settings-shell :global(h1),
        .settings-shell :global(h2),
        .settings-shell :global(h3),
        .settings-shell :global(h4) {
          font-family: var(--jakarta), sans-serif !important;
        }

        .settings-shell :global(h1),
        .settings-shell :global(h2),
        .settings-shell :global(h3) {
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .settings-shell :global(.btn-primary) {
          font-family: var(--jakarta), sans-serif !important;
          letter-spacing: 0;
          text-transform: none;
          font-size: 13px;
          font-weight: 850;
        }

        @media (max-width: 900px) {
          .settings-layout {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }

          .settings-panel {
            padding: 22px !important;
          }
        }
      `}</style>
    </div>
  );
}
