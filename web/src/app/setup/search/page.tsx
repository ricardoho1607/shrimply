"use client";
import { showAppAlert } from '@/lib/appDialogs';


import React, { useRef, useState } from 'react';
import { Search, Info, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { getErrorMessage, withTimeout } from '@/lib/asyncUtils';
import { PendingJoinRequestScreen, usePendingJoinRequest } from '@/components/PendingJoinRequestScreen';
import OnboardingProgress from '@/components/OnboardingProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROUTES } from '@/config/routes';

type StaffRole = 'co-owner' | 'manager' | 'technician' | 'admin' | 'mechanic';

export default function CompanySearchPage() {
  const isReady = useOnboardingGuard('setup');
  const { user, searchCompanies, requestToJoinCompany } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { pendingRequest, loading: pendingRequestLoading } = usePendingJoinRequest(user?.uid);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Array<{ id: string; companyName: string; primaryLocation?: { address?: string } | string; memberCount?: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sentRequestCompanyId, setSentRequestCompanyId] = useState<string | null>(null);
  const latestSearchId = useRef(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const requestId = latestSearchId.current + 1;
    latestSearchId.current = requestId;
    setSearching(true);
    setSearchError(null);
    try {
      const farms = await withTimeout(searchCompanies(searchTerm), 12000, 'Farm search is taking too long. Please try again.');
      if (latestSearchId.current !== requestId) return;
      setResults(farms);
    } catch (error: unknown) {
      if (latestSearchId.current === requestId) {
        const message = getErrorMessage(error, 'Unable to search farms right now.');
        console.error(error);
        setSearchError(message);
        setResults([]);
      }
    } finally {
      if (latestSearchId.current === requestId) {
        setSearching(false);
      }
    }
  };

  const handleJoinRequest = async (company: { id: string; companyName: string }) => {
    if (!user) return;
    if (!['co-owner', 'manager', 'technician', 'admin', 'mechanic'].includes(user.role || '')) {
      showAppAlert('Only staff roles can request to join an existing farm. Buyers and owners should create their own company profile.');
      return;
    }

    setRequesting(company.id);
    try {
      await withTimeout(requestToJoinCompany({
        companyId: company.id,
        requestedRole: user.role as StaffRole,
      }), 12000, 'Sending your request is taking too long. Please try again.');
      setSentRequestCompanyId(company.id);
      showAppAlert(`Request sent to ${company.companyName}. Stay on this setup screen until the company owner approves you.`);
    } catch (error: unknown) {
      showAppAlert(getErrorMessage(error, 'Failed to send request'));
    } finally {
      setRequesting(null);
    }
  };

  if (!isReady) return <OnboardingLoading />;
  if (pendingRequestLoading) return <OnboardingLoading />;
  if (pendingRequest && user?.role !== 'buyer') return <PendingJoinRequestScreen request={pendingRequest} />;

  return (
    <main className="company-search-shell">
      <OnboardingProgress
        percent={50}
        title={t.onboardingProgress.join}
        detail={t.onboardingProgress.joinDetail}
      />
      <header className="company-search-header">
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
        <h1>Find Your Farm</h1>
        <p>
          Search for the company you want to join. Your administrator will need to approve your request.
        </p>
        <button
          type="button"
          className="company-search-back"
          onClick={() => router.push(ROUTES.setupChoice)}
        >
          <ArrowLeft size={16} />
          Back to setup options
        </button>
      </header>

      <div className="company-search-content">
        <form className="company-search-form" onSubmit={handleSearch}>
          <div className="company-search-input-wrap">
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input
              id="company-search"
              aria-label="Search by farm name"
              className="company-search-input"
              placeholder="Search by farm name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="company-search-submit"
            disabled={searching}
          >
            {searching ? '...' : 'Search'}
          </button>
        </form>

        {searchError && (
          <div role="alert" style={{ color: '#B42318', background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>
            {searchError}
          </div>
        )}

        <div className="company-search-results">
          {results.length > 0 ? results.map(company => (
            <div key={company.id} className="company-result-card">
              <div className="company-result-details">
                <h4>{company.companyName}</h4>
                <p className="company-result-location">
                  {typeof company.primaryLocation === 'string' ? company.primaryLocation : company.primaryLocation?.address || 'Location unknown'}
                </p>
                  {typeof company.memberCount === 'number' && (
                  <p className="company-result-members">{company.memberCount} team members</p>
                  )}
              </div>
              <button
                type="button"
                className={`company-result-action ${sentRequestCompanyId === company.id ? 'sent' : ''}`}
                onClick={() => handleJoinRequest(company)}
                disabled={requesting === company.id || sentRequestCompanyId === company.id}
              >
                {sentRequestCompanyId === company.id
                  ? 'Request Sent'
                  : requesting === company.id ? 'Sending...' : 'Request Access'}
              </button>
            </div>
          )) : searchTerm && !searching ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)' }}>
              No farms found matching &quot;{searchTerm}&quot;
            </div>
          ) : null}
        </div>

        <div className="company-search-help">
          <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <b>Can&apos;t find your farm?</b> Ask your manager for an invitation link, or ensure they have enabled &quot;Public Profile&quot; in their company settings.
          </p>
        </div>
      </div>

      <style jsx>{`
        .company-search-shell {
          min-height: 100vh;
          padding: 64px 24px 40px;
          background: var(--bg-dark);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .company-search-header {
          width: min(600px, 100%);
          margin: 24px auto 30px;
          text-align: center;
        }
        .company-search-header h1 {
          margin: 0 0 10px;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .company-search-header p {
          max-width: 500px;
          margin: 0 auto;
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.6;
        }
        .company-search-back {
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
        .company-search-back:hover {
          background: var(--primary-dim);
          color: var(--primary);
        }
        .company-search-back:focus-visible,
        .company-search-submit:focus-visible,
        .company-search-input:focus-visible {
          outline: 3px solid rgba(50, 130, 184, 0.22);
          outline-offset: 2px;
        }
        .company-search-content {
          width: min(700px, 100%);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .company-search-form {
          display: flex;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 28px rgba(15, 76, 117, 0.06);
        }
        .company-search-input-wrap {
          position: relative;
          flex: 1;
        }
        .company-search-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 1px solid var(--border);
          border-radius: 13px;
          outline: none;
          background: #f8fafc;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 15px;
          transition: border-color 160ms ease, background 160ms ease;
        }
        .company-search-input:focus {
          border-color: var(--secondary);
          background: #fff;
        }
        .company-search-submit {
          min-width: 112px;
          padding: 0 24px;
          border: 0;
          border-radius: 13px;
          background: var(--primary);
          color: #fff;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: background 160ms ease, transform 160ms ease;
        }
        .company-search-submit:hover:not(:disabled) {
          background: #0b3f62;
          transform: translateY(-1px);
        }
        .company-search-submit:disabled {
          cursor: wait;
          opacity: 0.65;
        }
        .company-search-help {
          display: flex;
          gap: 10px;
          padding: 16px;
          border: 1px solid rgba(50, 130, 184, 0.12);
          border-radius: 16px;
          background: rgba(50, 130, 184, 0.05);
        }
        .company-search-help p {
          margin: 0;
        }
        .company-search-results {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .company-result-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(15, 76, 117, 0.05);
        }
        .company-result-details {
          min-width: 0;
          text-align: left;
        }
        .company-result-details h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 17px;
          font-weight: 750;
        }
        .company-result-location {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        .company-result-members {
          margin: 7px 0 0;
          color: var(--text-faint);
          font-size: 12px;
        }
        .company-result-action {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 10px 18px;
          border: 0;
          border-radius: 11px;
          background: var(--primary-dim);
          color: var(--primary);
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }
        .company-result-action:hover:not(:disabled) {
          background: var(--primary);
          color: #fff;
          transform: translateY(-1px);
        }
        .company-result-action:focus-visible {
          outline: 3px solid rgba(50, 130, 184, 0.22);
          outline-offset: 2px;
        }
        .company-result-action:disabled {
          cursor: default;
          opacity: 0.7;
        }
        .company-result-action.sent {
          background: #eaf7ef;
          color: #15803d;
        }
        @media (max-width: 640px) {
          .company-search-shell {
            padding: 52px 16px 28px;
          }
          .company-search-header {
            margin: 18px auto 24px;
          }
          .company-search-header h1 {
            font-size: 32px;
          }
          .company-search-header p {
            max-width: 310px;
            font-size: 15px;
            line-height: 1.55;
          }
          .company-search-back {
            margin-top: 10px;
          }
          .company-search-content {
            gap: 18px;
          }
          .company-search-form {
            flex-direction: column;
          }
          .company-search-submit {
            min-height: 46px;
          }
          .company-search-help {
            padding: 14px;
          }
          .company-result-card {
            align-items: stretch;
            flex-direction: column;
            gap: 14px;
            padding: 18px;
          }
          .company-result-action {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
