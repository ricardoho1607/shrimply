export type OrsonNotificationPriority = 'high' | 'medium';

const HIGH_PRIORITY_COMPOUND_RISKS = new Set([
  'heavy_rain_low_do',
]);

export const getOrsonNotificationPriority = (
  severity: string,
  riskIds: string | string[],
): OrsonNotificationPriority => {
  const ids = Array.isArray(riskIds) ? riskIds : [riskIds];
  return severity === 'critical' || ids.some((id) => HIGH_PRIORITY_COMPOUND_RISKS.has(id))
    ? 'high'
    : 'medium';
};

interface OrsonPriorityNotification {
  id?: string;
  type: string;
  message?: string;
  priority: 'high' | 'medium' | 'low';
  pondId?: unknown;
  sourceDate?: unknown;
  data?: {
    pondId?: unknown;
    riskId?: unknown;
    severity?: unknown;
    sourceDate?: unknown;
    status?: unknown;
  };
  orsonRiskReport?: {
    findings?: {
      id?: unknown;
      severity?: unknown;
      eventDate?: unknown;
    }[];
  };
}

type OrsonNotificationLike = Omit<OrsonPriorityNotification, 'priority'> & { priority?: 'high' | 'medium' | 'low' };

export const getOrsonNotificationSourceDate = (notification: OrsonNotificationLike): string | null => {
  const riskId = notification.data?.riskId;
  const reportFinding = notification.orsonRiskReport?.findings?.find((finding) => (
    typeof riskId !== 'string' || finding.id === riskId
  ));
  const candidate = notification.data?.sourceDate
    ?? notification.sourceDate
    ?? reportFinding?.eventDate
    ?? notification.message?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return typeof candidate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(candidate)
    ? candidate.slice(0, 10)
    : null;
};

export const dedupeOrsonNotifications = <T extends OrsonNotificationLike>(notifications: T[]): T[] => {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    if (notification.type !== 'orson_risk') return true;
    const pondId = notification.data?.pondId ?? notification.pondId;
    const riskId = notification.data?.riskId;
    const sourceDate = getOrsonNotificationSourceDate(notification);
    if (typeof pondId !== 'string' || typeof riskId !== 'string' || !sourceDate) return true;
    const key = `${pondId}:${riskId}:${sourceDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getEffectiveNotificationPriority = (
  notification: OrsonPriorityNotification,
): 'high' | 'medium' | 'low' => {
  if (notification.priority === 'high' || notification.type !== 'orson_risk') return notification.priority;

  const reportFindings = Array.isArray(notification.orsonRiskReport?.findings)
    ? notification.orsonRiskReport.findings
    : [];
  const riskIds = [notification.data?.riskId, ...reportFindings.map((finding) => finding.id)]
    .filter((id): id is string => typeof id === 'string');
  if (riskIds.length === 0) return notification.priority;

  const severity = reportFindings.some((finding) => finding.severity === 'critical')
    ? 'critical'
    : typeof notification.data?.severity === 'string'
      ? notification.data.severity
      : 'warning';
  return getOrsonNotificationPriority(severity, riskIds);
};
export const getOrsonAlertCaption = (notification: OrsonNotificationLike, createdText?: string): string | null => {
  if (notification.type !== 'orson_risk') return null;
  const sourceDate = getOrsonNotificationSourceDate(notification);
  const status = notification.data?.status === 'active' ? 'Active'
    : notification.data?.status === 'resolved' ? 'Resolved' : 'Historical';
  return `${status} · Event: ${sourceDate || 'date unavailable'}${createdText ? ` · Alert created: ${createdText}` : ''}`;
};
