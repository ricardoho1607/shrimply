'use client';

import { Suspense } from 'react';
import AdminCommandCenter from '@/components/admin/AdminCommandCenter';

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminCommandCenter />
    </Suspense>
  );
}
