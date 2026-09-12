const FARM_OPERATIONAL_DAY_ROLLOVER_HOUR = 3;

const shiftDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const farmDateKey = (
  timeZone,
  date = new Date(),
  rolloverHour = FARM_OPERATIONAL_DAY_ROLLOVER_HOUR,
) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value;
    const dateKey = `${part('year')}-${part('month')}-${part('day')}`;
    const localHour = Number(part('hour'));
    return Number.isFinite(localHour) && localHour < rolloverHour
      ? shiftDateKey(dateKey, -1)
      : dateKey;
  } catch (_error) {
    const utcDateKey = date.toISOString().slice(0, 10);
    return date.getUTCHours() < rolloverHour ? shiftDateKey(utcDateKey, -1) : utcDateKey;
  }
};

module.exports = {
  FARM_OPERATIONAL_DAY_ROLLOVER_HOUR,
  farmDateKey,
  shiftDateKey,
};
