function milliseconds(value) {
  if (value == null) return null;
  let result;
  if (typeof value.toMillis === 'function') result = value.toMillis();
  else if (value instanceof Date) result = value.getTime();
  else if (typeof value === 'number') result = value;
  else if (typeof value === 'string') result = Date.parse(value);
  else if (typeof value.seconds === 'number') result = value.seconds * 1000;
  return Number.isFinite(result) ? result : null;
}
exports.notificationTimestampMillis = (record, createdAt) => milliseconds(record.timestamp)
  ?? milliseconds(record.createdAt) ?? milliseconds(createdAt);
