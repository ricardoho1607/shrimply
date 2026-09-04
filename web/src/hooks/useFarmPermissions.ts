"use client";

import { useAuth } from '@/contexts/AuthContext';
import { hasFarmPermission, type FarmPermissionKey } from '../../../shared/permissions';

export function useFarmPermissions() {
  const { user, company } = useAuth();
  return (permission: FarmPermissionKey): boolean => hasFarmPermission(user, permission, company?.ownerId);
}
