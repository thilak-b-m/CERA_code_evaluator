import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReportInput, ReportValidationError } from './reports.schema.js';

test('report requests require supported sections and output formats', () => {
  assert.deepEqual(
    parseReportInput({ selectedSectionIds: ['course-performance'], format: 'CSV workbook' }),
    { selectedSectionIds: ['course-performance'], format: 'CSV workbook' },
  );
  assert.throws(
    () => parseReportInput({ selectedSectionIds: ['integrity-overview'] }),
    ReportValidationError,
  );
  assert.throws(
    () => parseReportInput({ selectedSectionIds: ['student-progress'], format: 'JSON' }),
    ReportValidationError,
  );
});
