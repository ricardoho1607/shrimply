export const FARM_PERMISSION_DEFINITIONS = [
  { key: 'viewFarm', label: 'View farm dashboard', description: 'View private farm, pond, and production data.' },
  { key: 'managePonds', label: 'Manage ponds', description: 'Create, edit, end, and remove ponds.' },
  { key: 'recordPondData', label: 'Record pond data', description: 'Add sampling, mortality, water-quality, and pond observations.' },
  { key: 'manageCycles', label: 'Manage production cycles', description: 'Create, start, edit, and close production cycles.' },
  { key: 'manageEnterpriseBlocks', label: 'Manage enterprise blocks', description: 'Create blocks and assign enterprise technicians.' },
  { key: 'manageLabReports', label: 'Manage lab reports', description: 'Create, confirm, and remove laboratory reports.' },
  { key: 'manageFeedInventory', label: 'Manage feeding and inventory', description: 'Record feeding and manage feed or treatment stock.' },
  { key: 'manageHarvests', label: 'Manage harvests', description: 'Create, edit, and remove harvest records.' },
  { key: 'viewAssets', label: 'View assets', description: 'View farm equipment and asset records.' },
  { key: 'manageAssets', label: 'Manage assets', description: 'Create, transfer, edit, and remove farm assets.' },
  { key: 'logAssetMaintenance', label: 'Log asset maintenance', description: 'Add maintenance and service history.' },
  { key: 'viewFinance', label: 'View finance', description: 'View cash flow, expenses, revenue, and financial reports.' },
  { key: 'manageFinance', label: 'Manage finance', description: 'Create, edit, and remove expenses, revenue, and market prices.' },
  { key: 'viewReports', label: 'View reports', description: 'Open production and operational reports.' },
  { key: 'exportReports', label: 'Export reports', description: 'Download or share PDF and spreadsheet reports.' },
  { key: 'useOrson', label: 'Use Orson AI', description: 'Ask Orson questions using private farm data.' },
  { key: 'editCompanySettings', label: 'Edit company settings', description: 'Change the company profile and public farm settings.' },
  { key: 'manageTeam', label: 'Manage team', description: 'Invite, approve, assign, and remove team members.' },
  { key: 'submitDiseaseReports', label: 'Submit disease reports', description: 'Create disease alerts for the farm.' },
  { key: 'resolveDiseaseReports', label: 'Resolve disease reports', description: 'Mark disease alerts contained or resolved.' },
  { key: 'manageMarketplace', label: 'Manage marketplace', description: 'Create and manage marketplace listings and responses.' },
  { key: 'manageCompanyDeletion', label: 'Manage company deletion', description: 'Request, approve, or cancel company deletion.' },
] as const;

export type FarmPermissionKey = typeof FARM_PERMISSION_DEFINITIONS[number]['key'];
export type FarmUserRole = 'owner' | 'co-owner' | 'manager' | 'technician' | 'admin' | 'mechanic' | 'buyer';
export const FARM_STAFF_ROLES = ['co-owner', 'manager', 'technician', 'admin', 'mechanic'] as const;
export type FarmStaffRole = typeof FARM_STAFF_ROLES[number];
export type FarmPermissionSet = Record<FarmPermissionKey, boolean>;
export type FarmPermissionOverrides = Partial<FarmPermissionSet>;

const ALL_PERMISSION_KEYS = FARM_PERMISSION_DEFINITIONS.map(({ key }) => key);

const enabled = (...keys: FarmPermissionKey[]): FarmPermissionSet => Object.fromEntries(
  ALL_PERMISSION_KEYS.map((key) => [key, keys.includes(key)]),
) as FarmPermissionSet;

const ALL_PERMISSIONS = enabled(...ALL_PERMISSION_KEYS);

export const FARM_ROLE_PERMISSION_DEFAULTS: Record<FarmUserRole, FarmPermissionSet> = {
  owner: ALL_PERMISSIONS,
  'co-owner': ALL_PERMISSIONS,
  manager: enabled(
    'viewFarm', 'viewAssets', 'viewFinance', 'manageFinance', 'viewReports', 'exportReports',
    'useOrson', 'editCompanySettings', 'submitDiseaseReports', 'resolveDiseaseReports', 'manageMarketplace',
  ),
  admin: enabled(
    'viewFarm', 'viewAssets', 'viewFinance', 'manageFinance', 'viewReports', 'exportReports',
    'useOrson', 'editCompanySettings', 'submitDiseaseReports', 'resolveDiseaseReports', 'manageMarketplace',
  ),
  technician: enabled(
    'viewFarm', 'managePonds', 'recordPondData', 'manageCycles', 'manageLabReports',
    'manageFeedInventory', 'manageHarvests', 'viewAssets', 'manageAssets', 'logAssetMaintenance',
    'viewReports', 'exportReports', 'useOrson', 'submitDiseaseReports', 'manageMarketplace',
  ),
  mechanic: enabled('viewFarm', 'viewAssets', 'logAssetMaintenance'),
  buyer: enabled('manageMarketplace'),
};

export const normalizeFarmUserRole = (value: unknown): FarmUserRole => (
  typeof value === 'string' && value in FARM_ROLE_PERMISSION_DEFAULTS ? value as FarmUserRole : 'technician'
);

export const isFarmStaffRole = (value: unknown): value is FarmStaffRole => (
  typeof value === 'string' && FARM_STAFF_ROLES.includes(value as FarmStaffRole)
);

export const normalizePermissionOverrides = (value: unknown): FarmPermissionOverrides => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(ALL_PERMISSION_KEYS.flatMap((key) => (
    typeof (value as Record<string, unknown>)[key] === 'boolean'
      ? [[key, (value as Record<string, boolean>)[key]]]
      : []
  ))) as FarmPermissionOverrides;
};

export const getDefaultPermissions = (role: unknown, isCompanyOwner = false): FarmPermissionSet => (
  isCompanyOwner ? ALL_PERMISSIONS : FARM_ROLE_PERMISSION_DEFAULTS[normalizeFarmUserRole(role)]
);

export const getEffectivePermissions = (
  role: unknown,
  overrides?: unknown,
  isCompanyOwner = false,
): FarmPermissionSet => {
  const defaults = getDefaultPermissions(role, isCompanyOwner);
  if (isCompanyOwner) return defaults;
  return { ...defaults, ...normalizePermissionOverrides(overrides) };
};

export const createPermissionOverrides = (
  role: unknown,
  permissions: FarmPermissionSet,
  isCompanyOwner = false,
): FarmPermissionOverrides => {
  if (isCompanyOwner) return {};
  const defaults = getDefaultPermissions(role);
  return Object.fromEntries(ALL_PERMISSION_KEYS.flatMap((key) => (
    permissions[key] === defaults[key] ? [] : [[key, permissions[key]]]
  ))) as FarmPermissionOverrides;
};

export const rebasePermissionOverridesForRole = (
  role: FarmStaffRole,
  overrides?: unknown,
): FarmPermissionOverrides => createPermissionOverrides(
  role,
  getEffectivePermissions(role, overrides),
);

export const hasFarmPermission = (
  user: { role?: unknown; permissionOverrides?: unknown; uid?: string; id?: string } | null | undefined,
  permission: FarmPermissionKey,
  companyOwnerId?: string | null,
): boolean => {
  if (!user) return false;
  const userId = user.uid || user.id;
  return getEffectivePermissions(user.role, user.permissionOverrides, Boolean(userId && companyOwnerId === userId))[permission];
};
