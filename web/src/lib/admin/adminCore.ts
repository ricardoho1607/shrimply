import type {
  AccountHealth,
  AccountStatus,
  AdminDirectoryFilters,
  AdminDirectoryUser,
  HealthInput,
  HealthSignal,
  SensitiveActionValidation,
} from './types';

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export const maskEmail = (email: string): string => {
  const normalized = email.trim();
  const at = normalized.indexOf('@');
  if (at <= 0) return 'Unavailable';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(4, Math.min(8, local.length - visible.length)))}@${domain}`;
};

export const maskPhone = (phone: string): string => {
  const normalized = phone.trim();
  if (!normalized) return 'Unavailable';
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const prefix = normalized.startsWith('+') ? '+' : '';
  return `${prefix}•• ••• ••• ${digits.slice(-4)}`;
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return `${parts[0][0] || ''}${parts.length > 1 ? parts.at(-1)?.[0] || '' : ''}`.toUpperCase();
};

export const getLatestIsoTimestamp = (values: Array<string | null | undefined>): string | null => {
  let latestMs: number | null = null;
  values.forEach((value) => {
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    if (latestMs === null || parsed.getTime() > latestMs) latestMs = parsed.getTime();
  });
  return latestMs === null ? null : new Date(latestMs).toISOString();
};

const SIGNAL_CONFIG: Array<[keyof Omit<HealthInput, 'suspended'>, string, number]> = [
  ['loginRecencyScore', 'Login recency', 20],
  ['samplingActivityScore', 'Sampling activity', 18],
  ['dataCompletenessScore', 'Data completeness', 15],
  ['featureAdoptionScore', 'Feature adoption', 15],
  ['subscriptionScore', 'Subscription & payments', 12],
];

const explainSignal = (label: string, score: number) => {
  if (score >= 80) return `${label} is a positive health signal.`;
  if (score >= 55) return `${label} is stable but has room to improve.`;
  return `${label} is reducing the account health score.`;
};

export const getStatusFromScore = (score: number, suspended = false): AccountStatus => {
  if (suspended) return 'Suspended';
  if (score >= 75) return 'Healthy';
  if (score >= 45) return 'At Risk';
  return 'Inactive';
};

export const calculateAccountHealth = (input: HealthInput): AccountHealth => {
  const signals: HealthSignal[] = SIGNAL_CONFIG.map(([key, label, weight]) => {
    const rawScore = input[key];
    const score = typeof rawScore === 'number' ? clamp(rawScore) : null;
    return {
      key,
      label,
      score,
      weight,
      explanation: score === null ? `${label} is unavailable and is excluded from the score.` : explainSignal(label, score),
    };
  });
  const availableSignals = signals.filter((signal): signal is HealthSignal & { score: number } => signal.score !== null);
  const availableWeight = availableSignals.reduce((total, signal) => total + signal.weight, 0);
  const score = availableWeight
    ? Math.round(availableSignals.reduce((total, signal) => total + signal.score * signal.weight, 0) / availableWeight)
    : 0;
  const label = getStatusFromScore(score, input.suspended === true);
  const weakest = [...availableSignals].sort((a, b) => a.score - b.score).slice(0, 2).map((signal) => signal.label.toLowerCase());
  const weakSummary = weakest.length ? weakest.join(' and ') : 'insufficient live signals';
  const summary = label === 'Healthy'
    ? `Strong account health. The main opportunities are ${weakSummary}.`
    : label === 'Suspended'
      ? 'The account is suspended. Health indicators remain visible for investigation only.'
      : `Health is constrained by ${weakSummary}.`;
  return { score, label, summary, signals };
};

const withinDays = (value: string | null, days: number, now: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && now.getTime() - date.getTime() <= days * 86_400_000;
};

export const filterDirectoryUsers = (
  users: AdminDirectoryUser[],
  search: string,
  filters: AdminDirectoryFilters,
  now = new Date(),
): AdminDirectoryUser[] => {
  const needle = search.trim().toLowerCase();
  return users.filter((user) => {
    if (filters.status !== 'all' && user.status !== filters.status) return false;
    if (filters.plan !== 'all' && user.plan.toLowerCase() !== filters.plan.toLowerCase()) return false;
    if (filters.country !== 'all' && user.country.toLowerCase() !== filters.country.toLowerCase()) return false;
    if (filters.activity === '7d' && !withinDays(user.lastActiveAt, 7, now)) return false;
    if (filters.activity === '30d' && !withinDays(user.lastActiveAt, 30, now)) return false;
    if (filters.activity === '90d+' && withinDays(user.lastActiveAt, 90, now)) return false;
    if (filters.registered === '30d' && !withinDays(user.joinedAt, 30, now)) return false;
    if (filters.registered === '90d' && !withinDays(user.joinedAt, 90, now)) return false;
    if (filters.registered === 'year' && !withinDays(user.joinedAt, 365, now)) return false;
    if (!needle) return true;
    return [user.id, user.name, user.email, user.maskedEmail, user.farmName, user.country]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
};

export const validateSensitiveAction = (reason: string, confirmed: boolean): SensitiveActionValidation => {
  const normalizedReason = reason.trim();
  const reasonError = normalizedReason.length >= 10 ? null : 'Enter a specific reason of at least 10 characters.';
  const confirmationError = confirmed ? null : 'Confirm that you understand this action will be audited.';
  return { allowed: !reasonError && !confirmationError, reasonError, confirmationError };
};

export const validateDeleteUserAction = (reason: string, confirmation: string, expectedConfirmation: string): SensitiveActionValidation => {
  const reasonError = reason.trim().length >= 10 ? null : 'Enter a specific reason of at least 10 characters.';
  const confirmationError = confirmation.trim().toLowerCase() === expectedConfirmation.trim().toLowerCase()
    ? null
    : `Type ${expectedConfirmation} exactly to confirm deletion.`;
  return { allowed: !reasonError && !confirmationError, reasonError, confirmationError };
};
