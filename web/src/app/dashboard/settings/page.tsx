"use client";

import { useSaveOperation } from '../../../../../shared/useSaveOperation';
import { prepareSaveData as removeUndefinedFields } from '@/lib/saveData';
import { updateRecordOnline, uploadSaveFile } from '@/lib/saveData';
import React, { useState, useEffect, useMemo } from 'react';
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
  XCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { syncPublicCompanyProfile } from '@/lib/publicCompanyProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useCurrency, CURRENCIES } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyMembers } from '@/hooks/useDashboardData';
import { getSupportedTimeZones, getSystemTimeZone, resolveFarmTimeZone } from '../../../../../shared/farmDate';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import CompanyBillingPanel from '@/components/CompanyBillingPanel';

const settingsShellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  maxWidth: '1120px',
  margin: '0 auto',
  fontFamily: 'var(--jakarta)',
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
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--text-muted)',
  fontFamily: 'var(--jakarta)',
};

const controlStyle: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-mid)',
  outline: 'none',
  color: 'var(--text-primary)',
  fontWeight: 400,
  fontSize: '14px',
  fontFamily: 'var(--jakarta)',
  width: '100%',
};

const getLocationValue = (company: { primaryLocation?: { address?: string } | string; location?: string } | null) => {
  const primaryLocation = company?.primaryLocation;
  if (typeof primaryLocation === 'string') return primaryLocation;
  return company?.location || primaryLocation?.address || '';
};

export default function SettingsPage() {
  const copy = useDashboardCopy();
  const { user, company, getJoinRequests, approveJoinRequest, rejectJoinRequest, removeMember, requestCompanyDeletion, approveCompanyDeletion, cancelCompanyDeletion } = useAuth();
  const { data: members } = useCompanyMembers<NonNullable<ReturnType<typeof useAuth>['user']>>();
  const [saving, setSaving] = useState(false);
  const { save, busy: savePending } = useSaveOperation();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
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
  const timeZoneOptions = useMemo(() => getSupportedTimeZones(), []);
  const hasPermission = useFarmPermissions();
  const canEditCompany = hasPermission('editCompanySettings');
  const canManageTeam = hasPermission('manageTeam');
  const canManageCompanyDeletion = hasPermission('manageCompanyDeletion');

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'billing') {
      queueMicrotask(() => setActiveTab('billing'));
    }
  }, []);

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
    timeZone: getSystemTimeZone(),
  });

  useEffect(() => {
    if (user) {
      queueMicrotask(() => setUserForm({ name: user.name || '', phone: user.phone || '' }));
    }
  }, [user?.name, user?.phone]);

  useEffect(() => {
    if (!company) return;
    queueMicrotask(() => {
      setCompanyForm({
        companyName: company.companyName || '',
        farmType: company.farmType || '',
        location: getLocationValue(company),
        businessSize: company.businessSize || 'medium',
        description: company.description || '',
        contactPhone: company.contactPhone || '',
        isPublicProfile: company.isPublicProfile ?? true,
        timeZone: resolveFarmTimeZone(company.timeZone),
      });
    });
  }, [company]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab !== 'organization' || !canManageTeam || !company) {
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
  }, [activeTab, canManageTeam, company, getJoinRequests]);

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

  const handleProfilePhoto = async (file?: File) => {
    if (!user || !file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      alert(copy('Choose an image smaller than 5 MB.'));
      return;
    }
    if (!save.acquire()) return;
    setUploadingPhoto(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const photoRef = storageRef(storage, `users/${user.uid}/profile/avatar-${Date.now()}.${extension}`);
      await uploadSaveFile(photoRef, file, { contentType: file.type });
      const profileImage = await getDownloadURL(photoRef);
      await updateRecordOnline(db, doc(db, 'users', user.uid), removeUndefinedFields({ profileImage }));
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert(copy('Failed to upload profile photo.'));
    } finally {
      save.release();
      setUploadingPhoto(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName?: string) => {
    if (!window.confirm(`Remove ${memberName || 'this member'} from the company?`)) return;
    setRemovingMemberId(memberId);
    try {
      await removeMember(memberId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove team member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRequestCompanyDeletion = async () => {
    if (!window.confirm(copy('Deleting this company requires approval from all owners and co-owners. Once all approve, the company and all its data will be permanently deleted.\n\nDo you want to initiate a company deletion request?'))) return;
    setDeletionLoading(true);
    try {
      const res = await requestCompanyDeletion();
      if (res.status === 'deleted') {
        alert(copy('Company has been permanently deleted.'));
        window.location.href = '/roleselection';
      } else {
        alert(copy('Company deletion requested. All owners and co-owners must approve before the company is deleted.'));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to request company deletion.');
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleApproveCompanyDeletion = async () => {
    if (!window.confirm(copy('Are you sure you want to approve deleting this company? This action is irreversible once all owners and co-owners approve.'))) return;
    setDeletionLoading(true);
    try {
      const res = await approveCompanyDeletion();
      if (res.status === 'deleted') {
        alert(copy('All owners approved and the company has been permanently deleted.'));
        window.location.href = '/roleselection';
      } else {
        alert(`Approval recorded (${res.approvedCount || 0}/${res.totalRequired || 0} approved).`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve company deletion.');
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleCancelCompanyDeletion = async () => {
    if (!window.confirm(copy('Are you sure you want to cancel the pending company deletion request?'))) return;
    setDeletionLoading(true);
    try {
      await cancelCompanyDeletion();
      alert(copy('Company deletion request has been cancelled.'));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel deletion request.');
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!user) return;
    if (activeTab === 'company' && !canEditCompany) return;
    setSaving(true);
    setSuccess(false);

    if (!save.acquire()) return;
    try {
      if (activeTab === 'profile') {
        await updateRecordOnline(db, doc(db, 'users', user.uid), removeUndefinedFields({
          name: userForm.name,
          phone: userForm.phone
        }));
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
          isSearchable: companyForm.isPublicProfile,
          timeZone: resolveFarmTimeZone(companyForm.timeZone),
          ownerId: company?.ownerId || user.uid,
          updatedAt: new Date().toISOString()
        };

        if (!company?.id && !user.companyId) {
          // Create new company record if missing
          await runTransaction(db, async tx => {
            await tx.get(doc(db, 'users', user.uid));
            tx.set(doc(db, 'companies', targetCompanyId), {
            ...companyData,
            id: targetCompanyId,
            teamMembers: [user.uid],
            createdAt: serverTimestamp(),
            });
          });
          await syncPublicCompanyProfile(targetCompanyId, {
            ...companyData,
            id: targetCompanyId,
          });
          
          // Link it to the user
          await updateRecordOnline(db, doc(db, 'users', user.uid), removeUndefinedFields({
            companyId: targetCompanyId
          }));
        } else {
          // Update existing company record
          await updateRecordOnline(db, doc(db, 'companies', targetCompanyId), removeUndefinedFields(companyData));
          await syncPublicCompanyProfile(targetCompanyId, {
            ...companyData,
            id: targetCompanyId,
          });
        }
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(`${copy('Failed to save settings:')} ${error instanceof Error ? error.message : copy('Unknown error')}`);
    } finally {
      save.release();
      setSaving(false);
    }
  };

  return (
    <div className="settings-shell authenticated-compact-page" style={settingsShellStyle}>
      
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
              className="settings-category-button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px',
                border: 'none', background: activeTab === tab.id ? 'var(--primary-dim)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 600 : 500, fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--jakarta)',
                transition: 'all 0.2s'
              }} disabled={savePending}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-card settings-panel" style={{ padding: '32px', borderRadius: '18px' }}>
          
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}><fieldset disabled={savePending} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 600, color: 'var(--primary)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {user?.profileImage ? <img src={user.profileImage} alt={user.name || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <label className="settings-avatar-button" style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#FFF', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingPhoto ? 'wait' : 'pointer', boxShadow: 'var(--shadow-card)' }}>
                    {uploadingPhoto ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
                    <input type="file" accept="image/*" disabled={savePending || uploadingPhoto} onChange={(event) => void handleProfilePhoto(event.target.files?.[0])} style={{ display: 'none' }} />
                  </label>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{userForm.name || t.settings.fullName || 'Your Name'}</h3>
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

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                {success && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13px', fontWeight: 600 }}><CheckCircle2 size={16} /> {t.settings.changesSaved || 'Changes saved'}</div>}
                <button type="submit" disabled={savePending || (saving || !canEditCompany)} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving && <Loader2 className="animate-spin" size={18} />}
                  {t.settings.saveChanges || 'Save Changes'}
                </button>
              </div>
            </fieldset></form>
          )}

          {activeTab === 'company' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}><fieldset disabled={savePending} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                  <Building2 size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{companyForm.companyName || t.companyDetails.title || 'Company Profile'}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.settings.orgSettings || 'Organization and farm-wide settings.'}</p>
                </div>
                </div>
                <Link href="/dashboard/company" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, background: '#fff' }}>
                  {copy('View profile')}
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
                    <option value="Shrimp Farm">{copy('Shrimp Farm')}</option>
                    <option value="Hatchery">{copy('Hatchery')}</option>
                    <option value="Processing Plant">{copy('Processing Plant')}</option>
                    <option value="Consultancy">{copy('Consultancy')}</option>
                    <option value="Shrimp Buyer">{copy('Shrimp Buyer')}</option>
                    <option value="Individual Buyer">{copy('Individual Buyer')}</option>
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
                  <label style={labelStyle}>{copy('Farm timezone')}</label>
                  <select
                    value={companyForm.timeZone}
                    onChange={e => setCompanyForm({...companyForm, timeZone: e.target.value})}
                    style={controlStyle}
                  >
                    {!timeZoneOptions.includes(companyForm.timeZone) && (
                      <option value={companyForm.timeZone}>{companyForm.timeZone}</option>
                    )}
                    {timeZoneOptions.map(timeZone => (
                      <option key={timeZone} value={timeZone}>{timeZone}</option>
                    ))}
                  </select>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {copy('DOC and daily Orson limits roll over together at 3:00 AM in this timezone.')}
                  </span>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>{copy('Contact Phone')}</label>
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
                    placeholder={copy('Tell buyers and team members about this operation.')}
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
                    <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{t.companySetup.publicProfile || 'Public Profile'}</span>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{t.companySetup.publicProfileDescription || 'Allow shrimp buyers to discover and contact your farm'}</span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                {success && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13px', fontWeight: 600 }}><CheckCircle2 size={16} /> {t.settings.updatedSuccessfully || 'Updated successfully'}</div>}
                <button type="submit" disabled={savePending || (saving)} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {t.settings.updateOrganization || 'Update Organization'}
                </button>
              </div>
            </fieldset></form>
          )}

          {activeTab === 'organization' && (
            <div className="settings-organization-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="settings-organization-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{copy('Team Members')}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{copy("Manage your organization's members and their roles.")}</p>
                </div>
                <button className="btn-primary settings-invite-button" style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }} disabled={savePending}>{copy('+ Invite Member')}</button>
              </div>

              {canManageTeam && (
                <div className="settings-join-requests" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={18} color="var(--primary)" />
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{copy('Pending join requests')}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>{copy('Approve staff waiting to join this company.')}</p>
                      </div>
                    </div>
                  </div>

                  {joinRequests.length === 0 && (
                    <div style={{ padding: '14px', borderRadius: '12px', background: '#FFFFFF', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                      {copy('No pending join requests.')}
                    </div>
                  )}

                  {joinRequests.map((request) => (
                    <div key={request.id} className="settings-join-request-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid var(--border)' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600 }}>
                        {(request.userName?.[0] || request.userEmail?.[0] || 'U').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{request.userName || request.userEmail}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{request.userEmail} • {request.requestedRole}</div>
                      </div>
                      <div className="settings-join-request-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          disabled={savePending || (processingRequestId === request.id)}
                          onClick={() => handleJoinRequestDecision(request.id, 'reject')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #FECDCA', background: '#FEF3F2', color: '#B42318', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <XCircle size={15} />
                          {copy('Reject')}
                        </button>
                        <button
                          type="button"
                          disabled={savePending || (processingRequestId === request.id)}
                          onClick={() => handleJoinRequestDecision(request.id, 'approve')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #BBE1FA', background: 'var(--primary)', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {processingRequestId === request.id ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
                          {copy('Approve')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {members.map((member) => (
                  <div key={member.id} className="settings-member-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px', background: 'var(--bg-mid)', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '18px', border: '1px solid var(--border)' }}>
                      {member.profileImage ? <img src={member.profileImage} alt={member.name || 'Team member'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /> : (member.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="settings-member-copy" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{member.name}</span>
                        {member.id === user?.uid && <span style={{ padding: '2px 8px', borderRadius: '100px', background: 'white', border: '1px solid var(--border)', fontSize: '10px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>{copy('You')}</span>}
                      </div>
                      <div className="settings-member-contact" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                        <span style={{ minWidth: 0, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', overflowWrap: 'anywhere' }}><Mail size={12} /> {member.email}</span>
                        {member.phone && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• {member.phone}</span>}
                      </div>
                    </div>
                    <div className="settings-member-role" style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{member.role || 'Member'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{member.id === company?.ownerId ? (t.roleSelection?.farmOwner || 'Owner') : member.role === 'co-owner' ? (t.roleSelection?.coOwner || 'Co-owner') : (t.roleSelection?.manager || 'Staff')}</div>
                    </div>
                    {canManageTeam
                      && member.id !== user?.uid
                      && member.id !== company?.ownerId
                      && !['owner', 'co-owner'].includes(member.role || '') && (
                      <button type="button" disabled={savePending || (removingMemberId === member.id)} onClick={() => void handleRemoveMember(member.id, member.name)} aria-label={`Remove ${member.name || 'member'}`} style={{ border: '1px solid #FECDCA', color: '#B42318', background: '#FEF3F2', borderRadius: '10px', padding: '9px', cursor: 'pointer' }}>
                        {removingMemberId === member.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Deletion Request Banner */}
              {company?.deletionRequest?.status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px', borderRadius: '16px', background: '#FEF3F2', border: '2px solid #FECDCA' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={20} color="#B42318" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#B42318' }}>{copy('Company Deletion Requested')}</h4>
                      <p style={{ fontSize: '13px', color: '#7A271A', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {copy('Requested by')} <strong>{company.deletionRequest.requestedByName || copy('an owner')}</strong>{copy('. Deleting the company requires unanimous approval from all owners and co-owners.')}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEE4E2', color: '#B42318', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    {copy('Approvals:')} {company.deletionRequest.approvedByIds?.length || 0} / {company.deletionRequest.requiredApproverIds?.length || 0} {copy('owners & co-owners')}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    {canManageCompanyDeletion && !company.deletionRequest.approvedByIds?.includes(user?.uid || '') && (
                      <button
                        type="button"
                        disabled={savePending || (deletionLoading)}
                        onClick={handleApproveCompanyDeletion}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: 'none', background: '#D92D20', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {deletionLoading ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                        {copy('Approve Deletion')}
                      </button>
                    )}
                    {canManageCompanyDeletion && (
                      <button
                        type="button"
                        disabled={savePending || (deletionLoading)}
                        onClick={handleCancelCompanyDeletion}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1px solid #D0D5DD', background: '#FFFFFF', color: '#344054', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {copy('Cancel Request')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              {canManageCompanyDeletion && company?.deletionRequest?.status !== 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #FECDCA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B42318' }}>
                    <AlertTriangle size={18} />
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{copy('Danger Zone')}</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {copy('Permanently delete this company and all associated records. This action requires unanimous approval from all owners and co-owners.')}
                  </p>
                  <div>
                    <button
                      type="button"
                      disabled={savePending || (deletionLoading)}
                      onClick={handleRequestCompanyDeletion}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: '1px solid #FECDCA', background: '#FEF3F2', color: '#B42318', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {deletionLoading ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                      {copy('Delete Company')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{t.settings.regionDisplay || 'Region & Display'}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.settings.regionDisplaySubtitle || 'Customize your language and currency preferences.'}</p>
              </div>

              {/* Language Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
                  <Languages size={20} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{t.settings.appLanguage || 'App Language'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as Parameters<typeof setLanguage>[0])}
                      style={{
                        padding: '16px', borderRadius: '16px', border: '1px solid',
                        borderColor: currentLanguage === lang.code ? 'var(--primary)' : 'var(--border)',
                        background: currentLanguage === lang.code ? 'var(--primary-dim)' : 'var(--bg-mid)',
                        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s'
                      }} disabled={savePending}
                    >
                      <span style={{ fontSize: '24px' }}>{lang.flag}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: currentLanguage === lang.code ? 'var(--primary)' : 'var(--text-primary)' }}>{lang.nativeName}</div>
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
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{t.settings.displayCurrency || 'Display Currency'}</span>
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
                      disabled={savePending || (!canEditCompany)}
                      onClick={() => setCurrency(curr.code as Parameters<typeof setCurrency>[0])}
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
                        <div style={{ fontSize: '14px', fontWeight: 600, color: currentCurrency === curr.code ? 'var(--primary)' : 'var(--text-primary)' }}>{curr.name}</div>
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

          {activeTab === 'billing' && company?.id && (
            <CompanyBillingPanel companyId={company.id} />
          )}

          {activeTab === 'notifications' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--text-faint)' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{t.settings.comingSoon || 'Coming Soon'}</h3>
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
          font-family: var(--jakarta) !important;
        }

        .settings-shell :global(h1),
        .settings-shell :global(h2),
        .settings-shell :global(h3) {
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .settings-shell :global(.btn-primary) {
          font-family: var(--jakarta) !important;
          letter-spacing: 0;
          text-transform: none;
          font-size: 14px;
          font-weight: 500;
        }

        .settings-category-button:hover {
          background: var(--primary-dim) !important;
          color: var(--primary) !important;
          outline: none !important;
        }

        .settings-avatar-button {
          width: 36px !important;
          min-width: 36px !important;
          max-width: 36px !important;
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          padding: 0 !important;
          border-radius: 50% !important;
          flex: 0 0 36px !important;
        }

        .settings-invite-button {
          flex: 0 0 auto;
          border-color: #0f4c75 !important;
          background: #0f4c75 !important;
          color: #ffffff !important;
          box-shadow: none !important;
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

        @media (max-width: 640px) {
          .settings-panel {
            min-width: 0;
            padding: 16px !important;
            overflow: hidden;
          }

          .settings-organization-panel {
            gap: 16px !important;
          }

          .settings-organization-header {
            align-items: stretch !important;
            flex-direction: column;
            gap: 12px;
          }

          .settings-invite-button {
            width: 100%;
            min-height: 40px !important;
            padding: 8px 12px !important;
            white-space: nowrap;
          }

          .settings-join-requests {
            min-width: 0;
            padding: 14px !important;
          }

          .settings-join-request-row,
          .settings-member-card {
            min-width: 0;
            align-items: flex-start !important;
            flex-wrap: wrap;
            gap: 12px !important;
            padding: 14px !important;
          }

          .settings-join-request-actions {
            width: 100%;
            padding-left: 54px;
            justify-content: flex-start !important;
          }

          .settings-member-copy {
            flex: 1 1 calc(100% - 60px) !important;
          }

          .settings-member-contact {
            align-items: flex-start !important;
            flex-direction: column;
            gap: 2px !important;
          }

          .settings-member-role {
            width: 100%;
            margin-left: 60px;
            display: flex;
            align-items: center;
            gap: 8px;
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
