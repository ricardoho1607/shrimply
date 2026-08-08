'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminOverview from '@/app/dashboard/admin/page';
import AdminCommandCenter from '@/components/admin/AdminCommandCenter';
import { resolveAdminView } from '@/lib/admin/adminCore';

function AdminRoute() {
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get('user');
  const view = resolveAdminView(selectedUserId);

  if (view === 'overview') return <AdminOverview />;
  return <AdminCommandCenter />;
}

export default function AdminPage() {
  return <Suspense fallback={null}><AdminRoute /></Suspense>;
}
