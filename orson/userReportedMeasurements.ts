// Only explicit, ordered pairs are calculated; ambiguous prose remains in the question.
export const calculateUserReportedChanges = (question: string) => {
  const metrics = [
    { metric: 'adg', pattern: 'ADG', unit: 'g/day' },
    { metric: 'daily_feed', pattern: '(?:daily\\s+)?feed', unit: 'kg/day' },
    { metric: 'dawn_do', pattern: '(?:pre[- ]?dawn|dawn)\\s+DO', unit: 'mg/L' },
    { metric: 'morning_do', pattern: 'morning\\s+DO', unit: 'mg/L' },
    { metric: 'ph_swing', pattern: 'pH\\s+swing', unit: 'pH units' },
    { metric: 'alkalinity', pattern: 'alkalinity', unit: 'mg/L' },
    { metric: 'salinity', pattern: 'salinity', unit: 'ppt' },
    { metric: 'fcr', pattern: 'FCR', unit: 'kg feed/kg biomass gain' },
  ];
  return metrics.flatMap(({ metric, pattern, unit }) => {
    const pair = new RegExp(`\\b${pattern}\\s+(?:(?:fell|dropped|rose|increased|decreased|changed|went)\\s+)?(?:from\\s+)?(\\d+(?:\\.\\d+)?)\\s*(?:g/day|kg/day|mg/L|ppt)?\\s*(?:to|→|->)\\s*(\\d+(?:\\.\\d+)?)`, 'i').exec(question);
    if (!pair) return [];
    const previous = Number(pair[1]);
    const current = Number(pair[2]);
    return [{
      metric, unit, previous, current,
      absolute_change: Math.round((current - previous) * 1000) / 1000,
      percent_change: previous === 0 ? null : Math.round((current - previous) / previous * 1000) / 10,
      source: 'user_reported_unverified',
      original_text: pair[0],
      limitations: ['Dates, units and measurement methods must be confirmed; not saved farm records.'],
    }];
  });
};
