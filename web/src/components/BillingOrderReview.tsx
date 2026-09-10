import Link from 'next/link';

export interface BillingOrderSelection {
  planId: string;
  planName: string;
  amount: number;
  interval: 'monthly' | 'cycle' | 'annual';
  pondLimit: number;
  monthlyRequests: number;
}

export default function BillingOrderReview({ companyName, selection, busy, onCancel, onConfirm }: {
  companyName: string;
  selection: BillingOrderSelection;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const duration = selection.interval === 'annual' ? '12 months' : selection.interval === 'cycle' ? '4 months' : '1 month';
  const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selection.amount);
  return <section aria-labelledby="order-review-title" style={{ border: '2px solid #3282B8', borderRadius: 18, padding: 26, background: '#fff', color: '#163449', maxWidth: 760 }}>
    <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: '#3282B8', margin: '0 0 8px' }}>COMPANY SUBSCRIPTION · ORDER REVIEW</p>
    <h2 id="order-review-title" style={{ fontSize: 26, margin: '0 0 22px' }}>Review your subscription</h2>
    <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) 2fr', gap: '12px 18px', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
      <dt>Company</dt><dd style={{ margin: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>{companyName}</dd>
      <dt>Product</dt><dd style={{ margin: 0 }}>Shrimply {selection.planName} — software subscription</dd>
      <dt>Access period</dt><dd style={{ margin: 0 }}>{duration}, prepaid in full</dd>
      <dt>Includes</dt><dd style={{ margin: 0 }}>{selection.pondLimit} physical ponds · Unlimited team members · {selection.monthlyRequests} total Orson requests/month (daily/weekly limits also apply)</dd>
      <dt style={{ borderTop: '1px solid #dbe4ea', paddingTop: 16, fontWeight: 800 }}>Total payment</dt><dd style={{ borderTop: '1px solid #dbe4ea', paddingTop: 16, margin: 0, fontWeight: 800, fontSize: 24 }}>{amount} <span style={{ fontSize: 12 }}>IDR</span></dd>
    </dl>
    <p style={{ background: '#e7f1f8', padding: 16, borderRadius: 10, fontSize: 14, lineHeight: 1.7, margin: '22px 0 16px' }}>This payment is only for your company’s Shrimply subscription. It is not a marketplace purchase, escrow payment or seller payout. Access activates after Midtrans payment confirmation is verified.</p>
    <p style={{ fontSize: 13, lineHeight: 1.7, color: '#526979' }}>No automatic debit. Renewing the same plan extends its active period. Switching paid plans starts a new period, without automatic proration or refund. Review the <Link href="/pricing#subscription-terms" target="_blank" rel="noopener noreferrer">subscription details and support information</Link> before paying.</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
      <button type="button" disabled={busy} onClick={onConfirm} className="btn-primary" style={{ padding: '13px 20px', borderRadius: 10, background: '#0F4C75', color: 'white', border: 0, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Opening secure checkout…' : 'Continue to Midtrans checkout'}</button>
      <button type="button" disabled={busy} onClick={onCancel} style={{ padding: '13px 20px', borderRadius: 10, background: '#fff', color: '#0F4C75', border: '1px solid #d1dfe8', fontWeight: 700, cursor: 'pointer' }}>Back to plans</button>
    </div>
    <p style={{ fontSize: 12, color: '#526979', margin: '18px 0 0' }}>You will choose an available payment method on Midtrans. No payment is taken by this button.</p>
  </section>;
}
