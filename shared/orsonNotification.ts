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
  type: string;
  priority: 'high' | 'medium' | 'low';
  data?: {
    riskId?: unknown;
    severity?: unknown;
  };
  orsonRiskReport?: {
    findings?: {
      id?: unknown;
      severity?: unknown;
    }[];
  };
}

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
export const getOrsonAlertCaption = (notification: { type: string; message?: string; data?: Record<string, unknown> }, createdText?: string): string | null => {
  if (notification.type !== 'orson_risk') return null;
  const sourceDate = notification.data?.sourceDate || notification.message?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  const status = notification.data?.status === 'active' ? 'Active'
    : notification.data?.status === 'resolved' ? 'Resolved' : 'Historical';
  return `${status} · Event: ${typeof sourceDate === 'string' ? sourceDate : 'date unavailable'}${createdText ? ` · Alert created: ${createdText}` : ''}`;
};
