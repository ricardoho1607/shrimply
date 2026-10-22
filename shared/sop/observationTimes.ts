import { localInstant } from "./engine";

export function farmLocalInput(iso: string, timeZone: string): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function farmLocalToIso(value: string, timeZone: string): string {
  if (!value) return "";
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) || !Number.isFinite(Date.parse(value + ":00Z")))
    throw new Error("Choose a valid date and time.");
  const [date, time] = value.split("T");
  const iso = new Date(localInstant(date, time, timeZone)).toISOString();
  if (farmLocalInput(iso, timeZone) !== value)
    throw new Error("This time does not exist because of a clock change. Choose another time.");
  return iso;
}

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
