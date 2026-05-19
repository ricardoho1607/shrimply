"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Mail, MessageSquareText, UserRound, X } from 'lucide-react';
import { getCompanyHealth } from './AdminPremiumSections';

type CompanyMetric = {
  id: string;
  companyName: string;
  ownerEmail: string;
  farmType: string;
  businessSize: string;
  teamMembersCount: number;
  pondCount: number;
  activeCycleCount: number;
  feedItemCount: number;
  additiveItemCount: number;
  createdAt: string | null;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  joinedAt: string | null;
  lastActive: string | null;
  pendingJoinRequest?: {
    id: string;
    companyId: string;
    companyName: string;
    requestedAt: string | null;
    requestedRole: string;
  } | null;
};

const NOTE_STORAGE_KEY = 'shrimply-admin-company-notes';

const formatDate = (value?: string | null) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function readNotes() {
  try {
    return JSON.parse(window.localStorage.getItem(NOTE_STORAGE_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveNote(companyId: string, note: string) {
  const notes = readNotes();
  notes[companyId] = note;
  window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
}

async function copyText(value: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 900, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function QuickActionButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  if (href) {
    return (
      <a href={href} className="dashboard-action dashboard-action-secondary" style={{ minHeight: 38, textDecoration: 'none' }}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="dashboard-action dashboard-action-secondary" style={{ minHeight: 38 }}>
      {children}
    </button>
  );
}

function RecommendedAction({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: '18px', borderRadius: '18px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontWeight: 900, marginBottom: '8px' }}>
        <ExternalLink size={18} color="var(--primary)" /> {title}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

export function AdminDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.38)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(560px, 100%)', height: '100%', borderRadius: '24px 0 0 24px', background: '#fff', padding: '28px', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 900 }}>{title}</h2>
          <button onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-mid)', color: 'var(--text-muted)', cursor: 'pointer' }} type="button">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CompanyDetailDrawer({ company, onClose }: { company: CompanyMetric; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const health = getCompanyHealth(company);
  const recommendedAction = company.pondCount === 0
    ? 'Message the owner and offer to help them add their first pond. This is the highest-friction onboarding step.'
    : company.activeCycleCount === 0 && company.feedItemCount + company.additiveItemCount === 0
      ? 'They have started setup but have not created enough operational data yet. Push them toward first sampling, feed, or inventory action.'
      : 'This company has meaningful setup progress. Review whether they are ready for a demo, feedback call, or paid conversion conversation.';

  useEffect(() => {
    setNote(readNotes()[company.id] || '');
    setSaved(false);
  }, [company.id]);

  const handleSave = () => {
    saveNote(company.id, note);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <AdminDrawer title={company.companyName} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ padding: '18px', borderRadius: '18px', background: health.bg, color: health.tone, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} />
          {health.label} · {health.reason}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {company.ownerEmail && (
            <QuickActionButton href={`mailto:${company.ownerEmail}`}>
              <Mail size={16} /> Email owner
            </QuickActionButton>
          )}
          <QuickActionButton onClick={() => copyText(company.ownerEmail || '')}>
            <Copy size={16} /> Copy email
          </QuickActionButton>
          <QuickActionButton onClick={() => copyText(company.id)}>
            <Copy size={16} /> Copy company ID
          </QuickActionButton>
        </div>

        <RecommendedAction title="Recommended next action" body={recommendedAction} />

        <div className="glass-card" style={{ padding: '20px' }}>
          <DetailRow label="Owner" value={company.ownerEmail || 'Unavailable'} />
          <DetailRow label="Farm type" value={company.farmType || 'Unavailable'} />
          <DetailRow label="Business size" value={company.businessSize || 'Unavailable'} />
          <DetailRow label="Ponds" value={company.pondCount} />
          <DetailRow label="Active cycles" value={company.activeCycleCount} />
          <DetailRow label="Team members" value={company.teamMembersCount} />
          <DetailRow label="Feed items" value={company.feedItemCount} />
          <DetailRow label="Additive items" value={company.additiveItemCount} />
          <DetailRow label="Created" value={formatDate(company.createdAt)} />
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 900 }}>
            <MessageSquareText size={18} /> Admin note
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Example: messaged owner, wants demo, needs help adding ponds..."
            style={{ width: '100%', minHeight: '140px', resize: 'vertical', borderRadius: '14px', border: '1px solid var(--border)', padding: '14px', outline: 'none', color: 'var(--text-primary)', font: 'inherit', lineHeight: 1.5 }}
          />
          <button onClick={handleSave} className="dashboard-action dashboard-action-primary" style={{ marginTop: '14px' }} type="button">
            {saved ? 'Saved' : 'Save local note'}
          </button>
          <div style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.45 }}>
            Stored in this browser only. Backend note storage can be added later when you need multi-device admin CRM.
          </div>
        </div>
      </div>
    </AdminDrawer>
  );
}

export function UserDetailDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const pendingRequest = user.pendingJoinRequest;
  const recommendedAction = pendingRequest
    ? `This user has a pending join request for ${pendingRequest.companyName || pendingRequest.companyId}. Ask the company owner to approve or reject it; the user is waiting on approval, not incomplete setup.`
    : !user.companyId && user.role !== 'buyer'
    ? 'This user has not joined or created a company. Send a short onboarding message and ask what blocked them.'
    : user.role === 'buyer'
      ? 'Buyer account. Check whether they are monitoring suppliers or need marketplace liquidity.'
      : 'User has a company link. Review recent activity and consider asking for product feedback.';

  return (
    <AdminDrawer title={user.name || user.email || 'User details'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserRound size={30} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {user.email && (
            <QuickActionButton href={`mailto:${user.email}`}>
              <Mail size={16} /> Email user
            </QuickActionButton>
          )}
          <QuickActionButton onClick={() => copyText(user.email || '')}>
            <Copy size={16} /> Copy email
          </QuickActionButton>
          <QuickActionButton onClick={() => copyText(user.id)}>
            <Copy size={16} /> Copy user ID
          </QuickActionButton>
        </div>

        <RecommendedAction title="Recommended next action" body={recommendedAction} />

        <div className="glass-card" style={{ padding: '20px' }}>
          <DetailRow label="Email" value={user.email || 'Unavailable'} />
          <DetailRow label="Role" value={user.role || 'No role'} />
          <DetailRow label="Company ID" value={user.companyId || 'No company'} />
          <DetailRow label="Join request" value={pendingRequest ? `Pending: ${pendingRequest.companyName || pendingRequest.companyId}` : 'None'} />
          {pendingRequest && <DetailRow label="Requested role" value={pendingRequest.requestedRole || user.role || 'Unavailable'} />}
          {pendingRequest && <DetailRow label="Requested" value={formatDate(pendingRequest.requestedAt)} />}
          <DetailRow label="Joined" value={formatDate(user.joinedAt)} />
          <DetailRow label="Last active" value={formatDate(user.lastActive)} />
        </div>
      </div>
    </AdminDrawer>
  );
}
