import {
  differenceInFarmCalendarDays,
  getFarmDateKey,
  getFarmPeriodDateKeys,
  isDateKeyInRange,
  isValidTimeZone,
} from './farmDate';
import { getPondCurrentDoc } from './pondCalculations';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

export const runFarmDateSelfTest = () => {
  const instant = new Date('2026-07-16T17:30:00.000Z');

  assert(getFarmDateKey(instant, 'Asia/Jakarta') === '2026-07-17', 'Jakarta rolls over at its local midnight');
  assert(getFarmDateKey(instant, 'Australia/Melbourne') === '2026-07-17', 'Melbourne uses its local calendar date');
  assert(getFarmDateKey(instant, 'America/Los_Angeles') === '2026-07-16', 'different company timezones can have different farm dates');
  assert(isDateKeyInRange('2026-07-16T14:30:00.000Z', '2026-07-17', '2026-07-17', 'Australia/Brisbane'), 'converts UTC timestamps to the UTC+10 farm date');
  assert(isValidTimeZone('Asia/Makassar'), 'accepts valid IANA timezones');
  assert(!isValidTimeZone('Indonesia/Central'), 'rejects invalid timezone labels');
  assert(!isDateKeyInRange(null, '2026-07-01', '2026-07-31', 'Asia/Jakarta'), 'does not coerce missing dates to 1970');
  assert(differenceInFarmCalendarDays('2026-07-17', '2026-07-15') === 2, 'calculates calendar-day differences');

  const week = getFarmPeriodDateKeys('week', instant, 'Asia/Jakarta');
  assert(week.startDateKey === '2026-07-10' && week.endDateKey === '2026-07-17', 'builds farm-local reporting ranges');
  assert(isDateKeyInRange('2026-07-17', week.startDateKey, week.endDateKey, 'Asia/Jakarta'), 'includes the farm-local current day');
  assert(!isDateKeyInRange('2026-07-09', week.startDateKey, week.endDateKey, 'Asia/Jakarta'), 'excludes records before the farm-local range');

  assert(getPondCurrentDoc({ docStart: '2026-07-15' }, 'Asia/Jakarta', instant) === 2, 'DOC increments on the farm calendar day');
  assert(getPondCurrentDoc({ docStart: '2026-06-01', baselineDate: '2026-07-16', baselineDoc: 45 }, 'Asia/Jakarta', instant) === 46, 'baseline DOC uses farm calendar days');

  return true;
};
