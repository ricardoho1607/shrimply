"use client";
import { getUserErrorMessage } from '@/lib/userError';

import { showAppAlert } from '@/lib/appDialogs';


import { useCallback, useEffect, useState } from 'react';
import { Check, CreditCard, Loader2, Sparkles } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import BillingOrderReview from './BillingOrderReview';

type PlanId = 'free' | 'plus' | 'pro';
type BillingInterval = 'monthly' | 'cycle' | 'annual';

interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  pondLimit: number;
  prices: Record<BillingInterval, number>;
  orson: { monthlyTotal: number };
  features: string[];
}

interface BillingSummary {
  companyName: string;
  payments?: Array<{ orderId: string; planName: string; amount: number; status: string; activated: boolean; createdAt: string | null }>;
  entitlements: {
    planId: PlanId | 'legacy' | 'lifetime';
    planName: string;
    status: string;
    pondLimit: number | null;
    orson: { monthlyTotal: number | null };
    currentPeriodEnd: string | null;
    graceUntil: string | null;
    scheduledPlanId: PlanId | null;
    complimentaryAccess?: { planId: string; expiresAt: string; basePlanId: string } | null;
  };
  usage: { physicalPonds: number; orsonMonthly: number };
  plans: PlanDefinition[];
  intervals: Array<{ id: BillingInterval; label: string; months: number }>;
  canManageBilling: boolean;
}

const formatIdr = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value);

const usagePercent = (used: number, limit: number | null) => (
  limit && limit > 0 ? Math.min((used / limit) * 100, 100) : 0
);

export default function CompanyBillingPanel({ companyId }: { companyId: string }) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(true);
  const [workingPlanId, setWorkingPlanId] = useState<PlanId | null>(null);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);

  const loadSummary = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const callable = httpsCallable<{ companyId: string }, BillingSummary>(
        getFunctions(app),
        'getCompanyBillingSummary',
      );
      const result = await callable({ companyId });
      setSummary(result.data);
    } catch (loadError) {
      setError(getUserErrorMessage(loadError, 'Could not load billing details.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    queueMicrotask(() => { void loadSummary(); });
    const refresh = window.setInterval(() => { if (document.visibilityState === "visible") void loadSummary(true); }, 300000);
    const onVisible = () => { if (document.visibilityState === "visible") void loadSummary(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, [loadSummary]);

  const changePlan = async (plan: PlanDefinition) => {
    if (!summary?.canManageBilling || workingPlanId) return;
    setWorkingPlanId(plan.id);
    setError('');
    try {
      if (plan.id !== 'free') {
        const callable = httpsCallable<
          { companyId: string; planId: PlanId; interval: BillingInterval; returnUrl: string },
          { redirectUrl: string }
        >(getFunctions(app), 'createMidtransPlanPayment');
        const result = await callable({
          companyId,
          planId: plan.id,
          interval,
          returnUrl: window.location.href,
        });
        window.location.assign(result.data.redirectUrl);
        return;
      }
      const callable = httpsCallable<
        { companyId: string; planId: PlanId },
        { status: string; effectiveAt?: string }
      >(getFunctions(app), 'scheduleCompanyPlanChange');
      const result = await callable({ companyId, planId: plan.id });
      await loadSummary();
      if (result.data.status === 'scheduled' && result.data.effectiveAt) {
        showAppAlert(`Plan change scheduled for ${new Date(result.data.effectiveAt).toLocaleDateString()}.`);
      }
    } catch (changeError) {
      setError(getUserErrorMessage(changeError, 'Could not update the company plan.'));
    } finally {
      setWorkingPlanId(null);
    }
  };

  if (loading) {
    return <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" color="var(--primary)" /></div>;
  }
  if (!summary) {
    return <div><p style={{ color: 'var(--danger)' }}>{error || 'Billing information is unavailable.'}</p><button className="btn-primary" onClick={() => void loadSummary()}>Try again</button></div>;
  }

  const pondLimit = summary.entitlements.pondLimit;
  const orsonLimit = summary.entitlements.orson.monthlyTotal;
  const lifetime = summary.entitlements.planId === 'lifetime';

  if (selectedPlan) return <div style={{ display: 'grid', gap: 18 }}>
    {error && <p role="alert" style={{ color: '#B42318' }}>{error}</p>}
    <BillingOrderReview companyName={summary.companyName || companyId} selection={{ planId: selectedPlan.id, planName: selectedPlan.name, amount: selectedPlan.prices[interval], interval, pondLimit: selectedPlan.pondLimit, monthlyRequests: selectedPlan.orson.monthlyTotal }} busy={workingPlanId !== null} onCancel={() => setSelectedPlan(null)} onConfirm={() => void changePlan(selectedPlan)} />
  </div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Company subscription</p>
          <h2 style={{ margin: '7px 0 5px', fontSize: 26 }}>{summary.entitlements.planName}</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Unlimited team members. Limits are shared by the whole company.</p>
        </div>
        {!lifetime && <div style={{ display: 'inline-flex', padding: 4, background: 'var(--bg-mid)', borderRadius: 12, gap: 4 }}>
          {summary.intervals.map((option) => (
            <button key={option.id} type="button" onClick={() => setInterval(option.id)} style={{ border: 0, borderRadius: 9, padding: '9px 12px', cursor: 'pointer', background: interval === option.id ? '#fff' : 'transparent', color: interval === option.id ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontFamily: 'inherit' }}>
              {option.label}
            </button>
          ))}
        </div>}
      </div>

      {lifetime && <p role="status" style={{ margin: 0, color: 'var(--primary)', lineHeight: 1.6 }}>Your company has lifetime free access, including unlimited ponds, team members and Orson requests. No payment or renewal is required. Normal security and technical safeguards still apply.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {[
          { label: 'Physical ponds', used: summary.usage.physicalPonds, limit: pondLimit, color: '#3282B8' },
          { label: 'Orson requests this month', used: summary.usage.orsonMonthly, limit: orsonLimit, color: '#7C3AED' },
        ].map((metric) => (
          <div key={metric.label} style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 15, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}><span style={{ color: 'var(--text-muted)' }}>{metric.label}</span><strong>{metric.used} / {metric.limit ?? 'Unlimited'}</strong></div>
            <div style={{ height: 7, borderRadius: 10, background: 'var(--bg-mid)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${usagePercent(metric.used, metric.limit)}%`, background: metric.color, borderRadius: 10 }} /></div>
          </div>
        ))}
      </div>

      {summary.entitlements.complimentaryAccess && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Complimentary {summary.entitlements.complimentaryAccess.planId} access until {new Date(summary.entitlements.complimentaryAccess.expiresAt).toLocaleDateString()}. Your underlying {summary.entitlements.complimentaryAccess.basePlanId} benefits and payment history are preserved.</p>}

      {summary.entitlements.currentPeriodEnd && (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>
          Paid contract access ends {new Date(summary.entitlements.currentPeriodEnd).toLocaleDateString()}.
          {summary.entitlements.scheduledPlanId ? ` ${summary.entitlements.scheduledPlanId} is scheduled next.` : ' Renew from this page before that date.'}
        </p>
      )}
      {error && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 13 }}>{error}</p>}

      {!lifetime && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 18 }}>
        {summary.plans.map((plan) => {
          const current = summary.entitlements.planId === plan.id;
          const price = plan.prices[interval];
          const freeCurrentPlan = current && plan.id === 'free';
          return (
            <section key={plan.id} style={{ padding: 22, borderRadius: 18, background: current ? 'rgba(50,130,184,.07)' : '#fff', border: current ? '2px solid var(--secondary)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 17 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div><h3 style={{ margin: 0, fontSize: 20 }}>{plan.name}</h3><p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>{plan.description}</p></div>
                {plan.id === 'pro' ? <Sparkles size={20} color="#7C3AED" /> : <CreditCard size={20} color="var(--secondary)" />}
              </div>
              <div><strong style={{ fontSize: 24 }}>{price === 0 ? 'Free' : formatIdr(price)}</strong>{price > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> / {interval === 'cycle' ? '4 months' : interval === 'annual' ? 'year' : 'month'}</span>}</div>
              <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>{plan.pondLimit} ponds · Unlimited users · {plan.orson.monthlyTotal} Orson requests/month</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
                {plan.features.map((feature) => <li key={feature} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.45 }}><Check size={15} color="#059669" style={{ flex: '0 0 auto', marginTop: 1 }} />{feature}</li>)}
              </ul>
              <button type="button" className={freeCurrentPlan ? '' : 'btn-primary'} disabled={freeCurrentPlan || !summary.canManageBilling || workingPlanId !== null} onClick={() => plan.id === 'free' ? void changePlan(plan) : setSelectedPlan(plan)} style={{ marginTop: 'auto', minHeight: 42, borderRadius: 11, border: freeCurrentPlan ? '1px solid var(--border)' : undefined, cursor: freeCurrentPlan ? 'default' : 'pointer', opacity: !summary.canManageBilling && !freeCurrentPlan ? .55 : 1 }}>
                {workingPlanId === plan.id ? <Loader2 className="animate-spin" size={17} /> : freeCurrentPlan ? 'Current plan' : !summary.canManageBilling ? 'Owner manages billing' : current ? 'Review renewal' : price === 0 ? 'Move to Free' : 'Review subscription'}
              </button>
            </section>
          );
        })}
      </div>}
      {!lifetime && <div style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 15, background: 'var(--bg-mid)', fontSize: 13, lineHeight: 1.6 }}>
        <strong>Enterprise</strong> is available for companies managing more than 100 ponds. Contact <a href="mailto:shrimply.tech@gmail.com">shrimply.tech@gmail.com</a> for custom capacity and support.
      </div>}
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>Midtrans is used only for Shrimply company subscriptions, not marketplace transactions. Payments are prepaid with no automatic debit. A plan change never deletes company records. <a href="/pricing#subscription-terms" target="_blank" rel="noopener noreferrer">Subscription details & payment support</a></p>
      {summary.canManageBilling && <section aria-label="Payment status">
        <h3 style={{ margin: '0 0 8px' }}>Payment status</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Returning from Midtrans does not itself confirm payment. Refresh after paying; pending payments do not activate a plan. Contact support with your order ID if a completed payment is not reflected here.</p>
        <button type="button" className="btn-primary" onClick={() => void loadSummary()}>Refresh payment status</button>
        {summary.payments?.length ? <ul style={{ listStyle: 'none', padding: 0 }}>{summary.payments.map(payment => <li key={payment.orderId} style={{ padding: '15px 0', borderBottom: '1px solid var(--border)', fontSize: 13, lineHeight: 1.7 }}><strong>{payment.planName} · {formatIdr(payment.amount)}</strong><br />Order: {payment.orderId}<br />Status: {payment.status}{payment.activated ? ' · Subscription activated' : ' · Not activated'}</li>)}</ul> : <p style={{ fontSize: 13 }}>No subscription payments yet.</p>}
      </section>}
    </div>
  );
}
