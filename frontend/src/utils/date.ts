const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export const parseApiDate = (value: string): Date => {
  const normalized = value.trim();

  if (!normalized) {
    return new Date(NaN);
  }

  // Backend timestamps are stored as UTC-naive datetimes. Treat those as UTC
  // before converting them to the browser's local timezone for display.
  return new Date(
    hasTimezone.test(normalized) ? normalized : `${normalized}Z`,
  );
};
