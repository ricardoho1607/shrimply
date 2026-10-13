export const removeUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined)
      .map((entry) => removeUndefinedFields(entry)) as T;
  }
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }

  return Object.entries(value).reduce((cleaned, [key, entry]) => {
    if (entry !== undefined) cleaned[key] = removeUndefinedFields(entry);
    return cleaned;
  }, {} as Record<string, unknown>) as T;
};
