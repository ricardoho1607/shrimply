"use client";

import React, { useState } from 'react';
import { Search, Building2, ArrowRight, UserPlus, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { ROUTES } from '@/config/routes';

export default function CompanySearchPage() {
  const isReady = useOnboardingGuard('setup');
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Array<{ id: string; companyName: string; primaryLocation?: { address?: string } | string }>>([]);
  const [searching, setSearching] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      const q = query(collection(db, 'companies'), where('isSearchable', '==', true));
      const snapshot = await getDocs(q);
      const farms: Array<{ id: string; companyName: string; primaryLocation?: { address?: string } | string }> = [];
      snapshot.forEach(doc => {
        const data = doc.data() as { companyName?: string; primaryLocation?: { address?: string } | string };
        if (data.companyName?.toLowerCase().includes(searchTerm.toLowerCase())) {
          farms.push({ id: doc.id, companyName: data.companyName, primaryLocation: data.primaryLocation });
        }
      });
      setResults(farms);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleJoinRequest = async (company: { id: string; companyName: string }) => {
    if (!user) return;
    setRequesting(company.id);
    try {
      await addDoc(collection(db, 'joinRequests'), {
        companyId: company.id,
        userId: user.uid,
        userName: user.name || user.email.split('@')[0],
        userEmail: user.email,
        requestedRole: user.role,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      });
      alert(`Request sent to ${company.companyName}! You'll be notified once approved.`);
      router.push(ROUTES.dashboard);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to send request');
    } finally {
      setRequesting(null);
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
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'var(--gradient-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--primary)'
        }}>
          <Search size={40} />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
          Find Your Farm
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
          Search for the company you want to join. Your administrator will need to approve your request.
        </p>
      </div>

      <div style={{ maxWidth: '700px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input 
              id="company-search"
              aria-label="Search by farm name"
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px 16px 16px 52px',
                outline: 'none',
                fontSize: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
              placeholder="Search by farm name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={searching}
            style={{
              padding: '0 32px',
              borderRadius: '16px',
              background: 'var(--primary)',
              color: '#FFFFFF',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {searching ? '...' : 'Search'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {results.length > 0 ? results.map(company => (
            <div key={company.id} style={{
              background: '#FFFFFF',
              padding: '24px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'var(--bg-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Building2 size={24} color="var(--primary)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: 700 }}>{company.companyName}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{typeof company.primaryLocation === 'string' ? company.primaryLocation : company.primaryLocation?.address || 'Location unknown'}</p>
                </div>
              </div>
              <button 
                onClick={() => handleJoinRequest(company)}
                disabled={requesting === company.id}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'var(--primary-dim)',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {requesting === company.id ? 'Sending...' : (
                  <>
                    Request Access
                    <UserPlus size={16} />
                  </>
                )}
              </button>
            </div>
          )) : searchTerm && !searching ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>
              No farms found matching "{searchTerm}"
            </div>
          ) : null}
        </div>

        <div style={{
          background: 'rgba(50, 130, 184, 0.05)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid rgba(50, 130, 184, 0.1)',
          display: 'flex',
          gap: '12px'
        }}>
          <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <b>Can't find your farm?</b> Ask your manager for an invitation link, or ensure they have enabled "Public Profile" in their company settings.
          </p>
        </div>
      </div>
    </main>
  );
}
