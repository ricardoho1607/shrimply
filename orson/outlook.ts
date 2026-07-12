import type {
  Orson72HourOutlook,
  OrsonOutlookDirection,
  OrsonRiskFinding,
  OrsonRiskReport,
  OrsonRiskSeverity,
} from './types';

const severityRank: Record<OrsonRiskSeverity, number> = {
  info: 0,
  watch: 1,
  warning: 2,
  critical: 3,
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const highestSeverity = (findings: OrsonRiskFinding[]): OrsonRiskSeverity => {
  return findings.reduce<OrsonRiskSeverity>((highest, finding) => {
    return severityRank[finding.severity] > severityRank[highest] ? finding.severity : highest;
  }, 'info');
};

const averageConfidence = (findings: OrsonRiskFinding[]) => {
  if (findings.length === 0) return 0.82;
  const top = findings.slice(0, 3);
  return round(top.reduce((sum, finding) => sum + finding.confidence, 0) / top.length);
};

const getDirection = (findings: OrsonRiskFinding[], level: OrsonRiskSeverity): OrsonOutlookDirection => {
  if (level === 'critical') return 'critical';

  const ids = new Set(findings.map((finding) => finding.id));
  const hasDeterioratingSignals =
    ids.has('low_do')
    || ids.has('do_decline')
    || ids.has('feed_allocation_drop')
    || ids.has('mortality_spike')
    || ids.has('salinity_shock');

  if (level === 'warning' && hasDeterioratingSignals) return 'deteriorating';
  if (level === 'warning') return 'watch';
  if (level === 'watch') return 'watch';
  return 'stable';
};

const getSummary = (direction: OrsonOutlookDirection, pondName: string, topFinding: OrsonRiskFinding | null) => {
  if (direction === 'critical') {
    return `${pondName} has critical biological risk in the next 72 hours.`;
  }

  if (direction === 'deteriorating') {
    return `${pondName} is trending in the wrong direction over the next 72 hours.`;
  }

  if (direction === 'watch') {
    return `${pondName} needs close observation over the next 72 hours.`;
  }

  if (direction === 'improving') {
    return `${pondName} appears to be improving, but continue normal checks.`;
  }

  if (topFinding) {
    return `${pondName} is mostly stable, with ${topFinding.title.toLowerCase()} as the main note.`;
  }

  return `${pondName} appears stable for the next 72 hours based on available data.`;
};

export const build72HourOutlook = (
  report: OrsonRiskReport,
  generatedAt = new Date(report.generatedAt),
): Orson72HourOutlook => {
  const actionableFindings = report.findings.filter((finding) => finding.id !== 'missing_data');
  const sortedFindings = [...actionableFindings].sort((a, b) => {
    return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
  });
  const topFinding = sortedFindings[0] ?? report.findings[0] ?? null;
  const level = highestSeverity(sortedFindings);
  const direction = getDirection(sortedFindings, level);

  return {
    pondId: report.pondId,
    pondName: report.pondName,
    direction,
    level,
    confidence: averageConfidence(topFinding ? sortedFindings : report.findings),
    summary: getSummary(direction, report.pondName, topFinding),
    topReason: topFinding?.summary ?? 'No major risk findings were detected from the available data.',
    nextAction: topFinding?.recommendation ?? 'Continue normal feeding, water-quality checks, and tray observation.',
    supportingFindings: sortedFindings.slice(0, 3).map((finding) => finding.id),
    generatedAt: generatedAt.toISOString(),
  };
};

export const build72HourOutlooks = (
  reports: OrsonRiskReport[],
  generatedAt = new Date(),
): Orson72HourOutlook[] => {
  return reports.map((report) => build72HourOutlook(report, generatedAt));
};
