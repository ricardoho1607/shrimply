'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminCommandCenter from '@/components/admin/AdminCommandCenter';
import { resolveAdminView } from '@/lib/admin/adminCore';

function AdminRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get('user');
  const view = resolveAdminView(selectedUserId);

  useEffect(() => {
    if (view === 'overview') router.replace('/dashboard/admin');
  }, [router, view]);

  if (view === 'overview') return null;
  return <AdminCommandCenter />;
}

export default function AdminPage() {
  return <Suspense fallback={null}><AdminRoute /></Suspense>;
}
