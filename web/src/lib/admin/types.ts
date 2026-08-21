import type { FarmPermissionOverrides, FarmPermissionSet } from '../../../../shared/permissions';

export type AccountStatus = 'Healthy' | 'At Risk' | 'Inactive' | 'Suspended';

export type AdminEventType =
  | 'login'
  | 'sampling'
  | 'water_quality'
  | 'report'
  | 'farm'
  | 'team'
  | 'subscription'
  | 'payment'
  | 'support'
  | 'security'
  | 'admin';

export type DataAvailability = 'live' | 'unavailable';
export type FarmBusinessSize = 'small' | 'medium' | 'large' | 'enterprise';

export interface AdminDirectoryUser {
  id: string;
  name: string;
  initials: string;
  maskedEmail: string;
  email?: string;
  status: AccountStatus;
  plan: string;
  country: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
  farmName: string | null;
}

export interface AdminDirectoryFilters {
  status: 'all' | AccountStatus;
  plan: string;
  country: string;
  activity: 'all' | '7d' | '30d' | '90d+';
  registered: 'all' | '30d' | '90d' | 'year';
}

export interface LinkedFarm {
  id: string;
  name: string;
  location: string;
  pondCount: number;
  totalAreaHa: number | null;
  businessSize: FarmBusinessSize;
}

export interface HealthSignal {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  explanation: string;
}

export interface AccountHealth {
  score: number;
  label: AccountStatus;
  summary: string;
  signals: HealthSignal[];
}

export interface FeatureAdoptionItem {
  key: string;
  label: string;
  percentage: number;
  eventCount: number | null;
  availability: DataAvailability;
}

export interface SubscriptionSummary {
  plan: string;
  status: string;
  renewalAt: string | null;
  billingInterval: string | null;
  paymentMethod: string;
  availability: DataAvailability;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  updatedAt: string | null;
}

export interface AdminTimelineEvent {
  id: string;
  type: AdminEventType;
  title: string;
  detail: string;
  timestamp: string;
  tone: 'positive' | 'neutral' | 'warning' | 'danger';
  metadata?: string;
}

export interface AccountIntelligence {
  id: string;
  name: string;
  initials: string;
  email: string;
  maskedEmail: string;
  maskedPhone: string;
  role: string;
  permissionOverrides: FarmPermissionOverrides;
  effectivePermissions: FarmPermissionSet;
  isCompanyOwner: boolean;
  plan: string;
  country: string;
  region: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
  status: AccountStatus;
  farms: LinkedFarm[];
  healthInputs: HealthInput;
  adoption: FeatureAdoptionItem[];
  subscription: SubscriptionSummary;
  support: {
    availability: DataAvailability;
    tickets: SupportTicket[];
    note?: string;
  };
  timeline: AdminTimelineEvent[];
  missingBackendSignals: string[];
  source: DataAvailability;
}

export interface HealthInput {
  loginRecencyScore: number | null;
  samplingActivityScore: number | null;
  dataCompletenessScore: number | null;
  featureAdoptionScore: number | null;
  subscriptionScore: number | null;
  syncReliabilityScore: number | null;
  supportScore: number | null;
  securityScore: number | null;
  suspended?: boolean;
}

export interface AdminDirectoryResponse {
  users: AdminDirectoryUser[];
  total: number;
  platformTotal: number;
  page: number;
  pageSize: number;
  source: DataAvailability;
  filterOptions?: {
    plans: string[];
    countries: string[];
  };
}

export interface SensitiveActionValidation {
  allowed: boolean;
  reasonError: string | null;
  confirmationError: string | null;
}

export interface DeleteAdminUserInput {
  userId: string;
  reason: string;
  confirmation: string;
  deleteCompany?: boolean;
  companyId?: string;
}

export interface DeleteAdminUserResult {
  success: true;
  userId: string;
  companyDeleted?: boolean;
  companyId?: string;
}

export interface CompanyOverviewItem {
  id: string;
  companyName: string;
  ownerId?: string;
  ownerEmail: string;
  farmType: string;
  businessSize: string;
  teamMembersCount: number;
  pondCount: number;
  activePondCount: number;
  inactivePondCount: number;
  activeCycleCount: number;
  feedItemCount: number;
  additiveItemCount: number;
  aiRequestCount: number;
  createdAt: string | null;
}

export interface OverviewTriageItem {
  id: string;
  type: 'user' | 'company';
  severity: 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  issue: string;
  action: string;
  userId?: string;
  companyId?: string;
  email?: string;
}

export interface PlatformOverviewMetrics {
  generatedAt: string;
  periodDays: 7 | 30;
  totals: {
    users: number;
    companies: number;
    ponds: number;
    activePonds: number;
    inactivePonds: number;
    activeCycles: number;
    buyers: number;
    owners: number;
    staff: number;
    marketplaceListings: number;
    aiRequests: number;
  };
  period: {
    newUsers: number;
    activeUsers: number;
    newCompanies: number;
    aiRequests: number;
  };
  dailyNewUsers: Array<{ date: string; count: number }>;
  roleBreakdown: Record<string, number>;
  users: AdminDirectoryUser[];
  companies: CompanyOverviewItem[];
  triage: OverviewTriageItem[];
}

export type ServiceHealthStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

export interface ServiceHealthItem {
  id: string;
  name: string;
  category: 'database' | 'auth' | 'functions' | 'ai' | 'storage';
  status: ServiceHealthStatus;
  uptimePercent: number;
  latencyMs: number;
  errorRate: number;
  lastChecked: string;
  description: string;
}

export interface AdminAuditEvent {
  id: string;
  actorId: string;
  targetId: string | null;
  action: string;
  timestamp: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityTelemetry {
  overallStatus: 'secure' | 'warning' | 'critical';
  ruleCompliancePercent: number;
  appCheckEnforced: boolean;
  activeRateLimits24h: number;
  failedAuthAttempts24h: number;
  privilegeViolations24h: number;
  recentAudits: AdminAuditEvent[];
}

export interface OrsonAiTelemetry {
  dailyRequests: number;
  dailyTokens: number;
  avgLatencyMs: number;
  quotaPercentUsed: number;
  successRate: number;
  taskBreakdown: {
    waterQuality: number;
    feeding: number;
    disease: number;
    assistant: number;
  };
}

export interface PlatformScaleMetrics {
  totalUsers: number;
  totalCompanies: number;
  totalPonds: number;
  activeCycles: number;
  totalShrimpStocked: number;
  totalHarvestKg: number;
  estimatedStorageMb: number;
}

export interface PlatformHealthOverview {
  generatedAt: string;
  periodDays: number;
  overallUptimePercent: number;
  avgApiLatencyMs: number;
  services: ServiceHealthItem[];
  security: SecurityTelemetry;
  ai: OrsonAiTelemetry;
  scale: PlatformScaleMetrics;
  recentOperations: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: 'farm' | 'security' | 'ai' | 'user';
  }>;
}

export type AdminViewMode = 'overview' | 'user' | 'farms' | 'subscriptions' | 'support' | 'security' | 'audit';

export interface DetailedFarmPond {
  id: string;
  name: string;
  areaM2: number;
  active: boolean;
  cycleNumber?: number;
  daysOld?: number;
  mbw?: number;
  fcr?: number;
  lastSamplingDate?: string | null;
}

export interface DetailedFarmMember {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive?: string | null;
}

export interface DetailedFarm {
  id: string;
  companyName: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail: string;
  ownerPhone?: string;
  farmType: string;
  businessSize: string;
  location: string;
  country: string;
  region: string;
  createdAt: string | null;
  pondCount: number;
  activePondCount: number;
  inactivePondCount: number;
  totalAreaM2: number;
  activeCycleCount: number;
  teamMembersCount: number;
  feedItemCount: number;
  additiveItemCount: number;
  aiRequestCount: number;
  ponds: DetailedFarmPond[];
  team: DetailedFarmMember[];
}

export interface SupportJoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  requestedRole: string;
  status: string;
  requestedAt: string | null;
  note?: string;
}

export interface SupportTesterRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  country: string;
  androidDevice: string;
  reason: string;
  status: string;
  platform: string;
  releaseTrack: string;
  requestCount: number;
  createdAt: string | null;
  lastRequestedAt: string | null;
  emailDeliveryStatus: string;
  emailDeliveryReason?: string;
}

export interface SupportDiseaseReport {
  id: string;
  companyId: string;
  companyName: string;
  pondId?: string;
  pondName?: string;
  symptoms: string[];
  severity: 'high' | 'medium' | 'low';
  diagnosis?: string;
  status: 'open' | 'investigating' | 'resolved';
  reporterEmail?: string;
  createdAt: string | null;
}

export interface SupportOverviewData {
  joinRequests: SupportJoinRequest[];
  testerRequests: SupportTesterRequest[];
  diseaseReports: SupportDiseaseReport[];
  totals: {
    pendingJoins: number;
    pendingTesters: number;
    openDisease: number;
    totalResolved: number;
  };
}

export interface SecurityPostureData {
  overallStatus: 'secure' | 'warning' | 'critical';
  appCheckMobileEnforced: boolean;
  appCheckWebEnforced: boolean;
  securityRulesVersion: string;
  roleDistribution: Record<string, number>;
  platformOwners: Array<{ id: string; name: string; email: string; assignedAt?: string | null }>;
  threatTelemetry: {
    failedAuth24h: number;
    activeRateLimitLocks: number;
    privilegedAccountCount: number;
    orphanedUsersCount: number;
  };
  recentSecurityEvents: AdminAuditEvent[];
}

export interface AuditLogFilters {
  category: 'all' | 'account' | 'security' | 'farm' | 'support' | 'directory';
  actor: string;
  search: string;
  dateRange: 'today' | '7d' | '30d' | '90d' | 'all';
}
