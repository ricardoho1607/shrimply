import {
  differenceInFarmCalendarDays,
  getFarmDateKey,
  getFarmOperationalDateKey,
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
  assert(getFarmOperationalDateKey(new Date('2026-07-16T18:59:59.000Z'), 'Asia/Jakarta') === '2026-07-16', 'operational day remains unchanged before 3am local time');
  assert(getFarmOperationalDateKey(new Date('2026-07-16T20:00:00.000Z'), 'Asia/Jakarta') === '2026-07-17', 'operational day rolls at 3am in Jakarta');
  assert(getFarmOperationalDateKey(new Date('2026-07-16T17:00:00.000Z'), 'Australia/Melbourne') === '2026-07-17', 'operational day rolls at 3am in Melbourne');
  assert(isDateKeyInRange('2026-07-16T14:30:00.000Z', '2026-07-17', '2026-07-17', 'Australia/Brisbane'), 'converts UTC timestamps to the UTC+10 farm date');
  assert(isValidTimeZone('Asia/Makassar'), 'accepts valid IANA timezones');
  assert(!isValidTimeZone('Indonesia/Central'), 'rejects invalid timezone labels');
  assert(!isDateKeyInRange(null, '2026-07-01', '2026-07-31', 'Asia/Jakarta'), 'does not coerce missing dates to 1970');
  assert(differenceInFarmCalendarDays('2026-07-17', '2026-07-15') === 2, 'calculates calendar-day differences');

  const week = getFarmPeriodDateKeys('week', instant, 'Asia/Jakarta');
  assert(week.startDateKey === '2026-07-10' && week.endDateKey === '2026-07-17', 'builds farm-local reporting ranges');
  assert(isDateKeyInRange('2026-07-17', week.startDateKey, week.endDateKey, 'Asia/Jakarta'), 'includes the farm-local current day');
  assert(!isDateKeyInRange('2026-07-09', week.startDateKey, week.endDateKey, 'Asia/Jakarta'), 'excludes records before the farm-local range');

  assert(getPondCurrentDoc({ docStart: '2026-07-15' }, 'Asia/Jakarta', new Date('2026-07-16T19:59:59.000Z')) === 1, 'DOC stays on the prior operational day before 3am');
  assert(getPondCurrentDoc({ docStart: '2026-07-15' }, 'Asia/Jakarta', new Date('2026-07-16T20:00:00.000Z')) === 2, 'DOC increments at 3am farm time');
  assert(getPondCurrentDoc({ docStart: '2026-07-15' }, 'Asia/Jakarta', '2026-07-17') === 2, 'reactive farm date keys drive DOC rollover');
  assert(getPondCurrentDoc({ docStart: '2026-06-01', baselineDate: '2026-07-16', baselineDoc: 45 }, 'Asia/Jakarta', instant) === 45, 'baseline DOC waits for the 3am operational boundary');

  return true;
};
