"use client";

import React, { useEffect, useState } from 'react';
import { Clock, Loader2, LogOut } from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import OnboardingProgress from '@/components/OnboardingProgress';

type PendingJoinRequest = {
  id: string;
  companyId: string;
  companyName: string;
  requestedAt: string | null;
  requestedRole: string;
};

const formatRequestedAt = (value: string | null) => {
  if (!value) return 'Recently requested';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently requested';
  return `Requested ${date.toLocaleDateString()}`;
};

const getTimestampValue = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return null;
};

export function usePendingJoinRequest(userId?: string) {
  const [pendingRequest, setPendingRequest] = useState<PendingJoinRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const pendingQuery = query(
      collection(db, 'joinRequests'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(pendingQuery, async (snapshot) => {
      if (snapshot.empty) {
        setPendingRequest(null);
        setLoading(false);
        return;
      }

      const sortedDocs = snapshot.docs
        .map((requestDoc) => ({ id: requestDoc.id, data: requestDoc.data() }))
        .sort((a, b) => {
          const aTime = new Date(getTimestampValue(a.data.requestedAt) || getTimestampValue(a.data.createdAt) || 0).getTime();
          const bTime = new Date(getTimestampValue(b.data.requestedAt) || getTimestampValue(b.data.createdAt) || 0).getTime();
          return bTime - aTime;
        });

      const latest = sortedDocs[0];
      const companyId = typeof latest.data.companyId === 'string' ? latest.data.companyId : '';
      let companyName = typeof latest.data.companyName === 'string' ? latest.data.companyName : '';

      if (!companyName && companyId) {
        try {
          const companyDoc = await getDoc(doc(db, 'publicCompanyProfiles', companyId));
          const company = companyDoc.exists() ? companyDoc.data() : null;
          companyName = typeof company?.companyName === 'string' ? company.companyName : companyId;
        } catch {
          companyName = companyId;
        }
      }

      setPendingRequest({
        id: latest.id,
        companyId,
        companyName: companyName || 'your company',
        requestedAt: getTimestampValue(latest.data.requestedAt) || getTimestampValue(latest.data.createdAt),
        requestedRole: typeof latest.data.requestedRole === 'string' ? latest.data.requestedRole : 'staff',
      });
      setLoading(false);
    }, (error) => {
      console.error('Error loading pending join request:', error);
      setPendingRequest(null);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return {
    pendingRequest: userId ? pendingRequest : null,
    loading: userId ? loading : false,
  };
}

export function PendingJoinRequestScreen({ request }: { request: PendingJoinRequest }) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '80px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <OnboardingProgress
          percent={75}
          title={t.onboardingProgress.pendingApproval}
          detail={t.onboardingProgress.pendingDetail}
        />
        <section style={{
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 24px 70px rgba(15, 76, 117, 0.08)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '22px',
          background: 'var(--primary-dim)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Clock size={36} />
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
          Waiting for Approval
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
          Your request to join {request.companyName} as {request.requestedRole} is pending. You will enter the dashboard automatically after the company owner approves it.
        </p>

        <div style={{
          padding: '16px',
          borderRadius: '16px',
          background: 'var(--bg-mid)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '28px',
        }}>
          {formatRequestedAt(request.requestedAt)}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #FECDCA',
            background: '#FEF3F2',
            color: '#B42318',
            fontWeight: 600,
            cursor: signingOut ? 'not-allowed' : 'pointer',
          }}
        >
          {signingOut ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
          Sign Out
        </button>
        </section>
      </div>
    </main>
  );
}
