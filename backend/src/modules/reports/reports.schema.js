export const REPORT_SECTIONS = [
  { id: 'course-performance', label: 'Course performance summary', defaultSelected: true },
  { id: 'assignment-results', label: 'Assignment results by assignment', defaultSelected: true },
  { id: 'student-progress', label: 'Student progress', defaultSelected: true },
  { id: 'submission-trends', label: 'Submission volume by week', defaultSelected: false },
];

const SECTION_IDS = new Set(REPORT_SECTIONS.map((section) => section.id));
const FORMATS = new Set(['PDF document', 'CSV workbook']);

export class ReportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReportValidationError';
    this.statusCode = 400;
  }
}

export function parseReportInput(input = {}) {
  const { selectedSectionIds, format = 'PDF document' } = input;
  if (
    !Array.isArray(selectedSectionIds)
    || selectedSectionIds.length === 0
    || selectedSectionIds.some((id) => typeof id !== 'string' || !SECTION_IDS.has(id))
  ) {
    throw new ReportValidationError('Select one or more supported report sections.');
  }
  if (!FORMATS.has(format)) {
    throw new ReportValidationError('Select PDF document or CSV workbook format.');
  }
  return {
    selectedSectionIds: [...new Set(selectedSectionIds)],
    format,
  };
}
