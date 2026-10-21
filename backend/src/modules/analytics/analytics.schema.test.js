import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalyticsValidationError, parseAnalyticsPeriod } from './analytics.schema.js';

test('analytics period accepts only current and previous windows', () => {
  assert.equal(parseAnalyticsPeriod(undefined), 'current');
  assert.equal(parseAnalyticsPeriod('previous'), 'previous');
  assert.throws(() => parseAnalyticsPeriod('all-time'), AnalyticsValidationError);
});
