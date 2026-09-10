export type OnboardingRole = 'owner' | 'co-owner' | 'technician' | 'manager' | 'admin' | 'buyer' | 'mechanic';

export type SetupDestination = 'company' | 'buyer' | 'join';

export interface OnboardingUserLike {
  role?: OnboardingRole | null;
  companyId?: string | null;
  hasCompletedSetup?: boolean;
}

export interface CompanyProfileLike {
  companyName?: string | null;
  primaryLocation?: string | { address?: string | null } | null;
  farmType?: string | null;
  businessSize?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  timeZone?: string | null;
}

export interface CompanySetupDraftLike extends CompanyProfileLike {
  timeZone?: string | null;
}

const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

export const hasCompanyLocation = (location: CompanyProfileLike['primaryLocation']): boolean => (
  hasText(location) || Boolean(location && typeof location === 'object' && hasText(location.address))
);

export const isCompanyProfileComplete = (company?: CompanyProfileLike | null): boolean => Boolean(
  company
  && hasText(company.companyName)
  && hasCompanyLocation(company.primaryLocation)
  && hasText(company.farmType)
);

export const getSetupDestination = (role?: OnboardingRole | null): SetupDestination | null => {
  if (role === 'owner') return 'company';
  if (role === 'buyer') return 'buyer';
  if (role) return 'join';
  return null;
};

export const isUserOnboardingComplete = (
  user?: OnboardingUserLike | null,
  company?: CompanyProfileLike | null,
  companyResolved = true,
): boolean => {
  if (!user?.role || !user.hasCompletedSetup) return false;
  if (user.role === 'buyer') return true;
  if (!user.companyId || !companyResolved || !company) return false;
  return user.role === 'owner' ? isCompanyProfileComplete(company) : true;
};

export const calculateProgressRange = (
  start: number,
  end: number,
  checks: boolean[],
): number => {
  if (checks.length === 0) return Math.round(start);
  const complete = checks.filter(Boolean).length;
  return Math.round(start + ((end - start) * complete) / checks.length);
};

export const getCompanySetupProgress = (
  draft: CompanySetupDraftLike,
  locationConfirmed: boolean,
): number => calculateProgressRange(50, 100, [
  hasText(draft.companyName),
  hasCompanyLocation(draft.primaryLocation),
  locationConfirmed,
  hasText(draft.farmType),
  hasText(draft.timeZone),
]);

export const getBuyerSetupProgress = (checks: boolean[]): number => calculateProgressRange(50, 100, checks);

export const getAccountSetupProgress = (checks: boolean[]): number => calculateProgressRange(0, 25, checks);

export const getCompanyProfileCompletion = (company?: CompanyProfileLike | null): number => {
  if (!company) return 0;
  const checks = [
    hasText(company.companyName),
    hasCompanyLocation(company.primaryLocation),
    hasText(company.farmType),
    hasText(company.contactPhone),
    hasText(company.description),
    hasText(company.timeZone),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};
