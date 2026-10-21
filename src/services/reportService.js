import { api } from './api.js';
import { formatDateTime } from '../utils/formatDate.js';

const REPORTS_PATH = '/api/reports/faculty';
const EXPORT_PAGE_SIZE = 100;
const MAX_EXPORT_PAGES = 50;

export const REPORT_TYPE_LABELS = {
  assignments: 'Assignment performance',
  students: 'Student performance',
  submissions: 'Submission & execution',
  evaluations: 'Evaluation & grading',
};

/* Columns whose values are ISO timestamps and should render as readable dates. */
const TIMESTAMP_KEYS = new Set(['submittedAt', 'lastSubmissionAt', 'updatedAt']);

export function formatReportValue(value, column) {
  if (value === null || value === undefined || value === '') return '—';
  if (column?.format === 'percent') return `${value}%`;
  if (column && TIMESTAMP_KEYS.has(column.key)) return formatDateTime(value);
  return String(value);
}

function describeFilters(report) {
  const { filters, filterOptions } = report;
  const labelOf = (options = [], value) => (
    options.find((option) => option.value === value)?.label || value
  );
  const parts = [];

  if (filters.assignmentId) parts.push(`Assignment: ${labelOf(filterOptions.assignments, filters.assignmentId)}`);
  if (filters.student) parts.push(`Student: ${labelOf(filterOptions.students, filters.student)}`);
  if (filters.language) parts.push(`Language: ${labelOf(filterOptions.languages, filters.language)}`);
  if (filters.status) parts.push(`Status: ${labelOf(filterOptions.statuses, filters.status)}`);
  if (filters.from || filters.to) {
    parts.push(`Date: ${filters.from || 'start'} to ${filters.to || 'today'}`);
  }

  return parts.length ? parts.join(' · ') : 'None';
}

function exportValue(row, column, emptyLabel) {
  const raw = row[column.key];
  if (raw === null || raw === undefined || raw === '') return emptyLabel;
  if (column.format === 'percent') return `${raw}%`;
  if (TIMESTAMP_KEYS.has(column.key)) return formatDateTime(raw);
  return String(raw);
}

/* Quote every CSV cell and neutralise spreadsheet formula injection. */
function csvCell(value) {
  const text = String(value ?? '');
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function reportHeading(report) {
  return REPORT_TYPE_LABELS[report.reportType] || report.reportType;
}

function buildReportCsv(report) {
  const rows = [
    ['CERA Reports & Analytics'],
    [reportHeading(report)],
    ['Generated', formatDateTime(report.generatedAt)],
    ['Filters', describeFilters(report)],
    [],
    report.columns.map((column) => column.label),
  ];

  if (report.rows.length === 0) {
    rows.push(['No records for the selected filters']);
  } else {
    for (const row of report.rows) {
      rows.push(report.columns.map((column) => exportValue(row, column, '')));
    }
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

const LINES_PER_PAGE = 38;

function buildPdf(lines, footer = 'CERA Report') {
  const pages = [];
  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  const pageNumbers = pages.map((_, index) => 4 + index * 2);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  pages.forEach((pageLines, index) => {
    const content = [
      'BT',
      '/F1 12 Tf',
      '50 740 Td',
      ...pageLines.map((line, lineIndex) => (
        lineIndex === 0 ? `(${escapePdfText(line)}) Tj` : `0 -18 Td (${escapePdfText(line)}) Tj`
      )),
      'ET',
      'BT',
      '/F1 9 Tf',
      '50 40 Td',
      `(${escapePdfText(`${footer} - page ${index + 1} of ${pages.length}`)}) Tj`,
      'ET',
    ].join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${4 + index * 2 + 1} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function buildReportPdf(report) {
  const lines = [
    'CERA Reports & Analytics',
    reportHeading(report),
    `Generated: ${formatDateTime(report.generatedAt)}`,
    `Filters: ${describeFilters(report)}`,
    '',
    'Summary',
  ];

  for (const card of report.summary) {
    lines.push(`  ${card.label}: ${exportValue({ value: card.value }, { key: 'value', format: card.format }, '—')}`);
  }

  for (const chart of report.charts || []) {
    if (!chart.data?.length) continue;
    lines.push('', chart.title);
    lines.push(`  ${chart.data.map((point) => `${point.name}: ${point.value}`).join(' | ')}`);
  }

  lines.push('', 'Details');
  lines.push(report.columns.map((column) => column.label).join(' | '));

  if (report.rows.length === 0) {
    lines.push('No records for the selected filters.');
  } else {
    for (const row of report.rows) {
      lines.push(report.columns.map((column) => exportValue(row, column, '—')).join(' | '));
    }
  }

  return buildPdf(lines, `CERA ${reportHeading(report)}`);
}

function toQueryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  return query.toString();
}

async function getReport(params, token) {
  const query = toQueryString(params);
  const result = await api.request(
    `${REPORTS_PATH}/${encodeURIComponent(params.type)}?${query}`,
    { token },
  );
  return result.report;
}

/*
 * Exports must match the on-screen filters, so walk the paginated endpoint and
 * gather every page (bounded) rather than exporting only the current page.
 */
async function collectReport(params, token) {
  const base = { ...params, page: 1, pageSize: EXPORT_PAGE_SIZE };
  const first = await getReport(base, token);
  const rows = [...first.rows];
  const total = first.pagination.total;
  const pages = Math.min(first.pagination.totalPages, MAX_EXPORT_PAGES);

  for (let page = 2; page <= pages; page += 1) {
    const next = await getReport({ ...base, page }, token);
    rows.push(...next.rows);
  }

  return { ...first, rows, truncated: rows.length < total };
}

export const reportService = {
  getReport,

  collectReport,

  async exportReport(params, format, token) {
    const report = await collectReport(params, token);
    const isCsv = format === 'CSV';
    return {
      blob: isCsv
        ? new Blob([`\uFEFF${buildReportCsv(report)}`], { type: 'text/csv;charset=utf-8;' })
        : buildReportPdf(report),
      filename: `cera-${report.reportType}-report.${isCsv ? 'csv' : 'pdf'}`,
      rowCount: report.rows.length,
      truncated: report.truncated,
    };
  },
};

export default reportService;
