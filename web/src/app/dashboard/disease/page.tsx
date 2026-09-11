"use client";
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';

type PublicAlert = { id: string; diseaseName?: string; status?: string; severity?: string; reportDate?: { toDate?: () => Date } | string; location?: { address?: string } };
export default function DiseaseReportPage() {
  const copy = useDashboardCopy();
  const [alerts, setAlerts] = useState<PublicAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => onSnapshot(query(collection(db, 'publicDiseaseAlerts'), orderBy('reportDate', 'desc')), snapshot => {
    setAlerts(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
    setLoading(false); setError(false);
  }, () => { setError(true); setLoading(false); }), []);
  return <div className="authenticated-compact-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
    <h1>{copy('Disease alerts')}</h1>
    <p>{copy('Regional alerts show approximate areas. Farm names, precise locations, symptoms and losses remain private.')}</p>
    <p>{copy('Use the mobile app to submit or manage your farm reports.')}</p>
    {loading && <p role="status">{copy('Loading alerts…')}</p>}
    {error && <p role="alert">{copy('Unable to load alerts. Check your connection and reload this page.')}</p>}
    {!loading && !error && alerts.length === 0 && <p>{copy('No regional alerts are available.')}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
      {alerts.map(alert => {
        const value = alert.reportDate;
        const date = typeof value === 'string' ? new Date(value) : value?.toDate?.();
        return <article key={alert.id} className="glass-card" style={{ padding: 20 }}>
          <h2>{alert.diseaseName || copy('Disease alert')}</h2>
          <p>{alert.location?.address || copy('Approximate region')}</p>
          <p>{copy('Status')}: {alert.status || copy('Not reported')} · {copy('Severity')}: {alert.severity || copy('Not reported')}</p>
          <p>{date && Number.isFinite(date.getTime()) ? date.toLocaleDateString() : copy('Date unavailable')}</p>
        </article>;
      })}
    </div>
  </div>;
}
