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

export interface AdminDirectoryUser {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  maskedEmail: string;
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
  maskedEmail: string;
  maskedPhone: string;
  email: string | null;
  phone: string | null;
  role: string;
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
}

export interface DeleteAdminUserResult {
  success: true;
  userId: string;
}
