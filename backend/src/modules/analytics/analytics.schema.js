export class AnalyticsValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AnalyticsValidationError';
    this.statusCode = 400;
  }
}

export function parseAnalyticsPeriod(value) {
  const period = value ?? 'current';
  if (!['current', 'previous'].includes(period)) {
    throw new AnalyticsValidationError('Period must be current or previous.');
  }
  return period;
}
