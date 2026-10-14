/** Do not substitute upload time for a farm measurement time. */
export function parseObservationTimes(
  values: Record<string, string>,
  now = Date.now(),
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(values)) {
    if (!value.trim()) continue;
    if (
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(
        value,
      )
    )
      throw new Error(
        `${field}: include the observation date, time, and timezone offset.`,
      );
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms > now + 60000)
      throw new Error(
        `${field}: observation time must be valid and cannot be in the future.`,
      );
    result[field] = new Date(ms).toISOString();
  }
  return result;
}
