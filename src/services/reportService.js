import { reportsData } from '../data/facultyMockData.js';

const TEMPLATE_STORAGE_KEY = 'cera-report-template';
const EXPORTS_STORAGE_KEY = 'cera-report-exports';

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    return false;
  }
}

function getSavedTemplate() {
  return readStorage(TEMPLATE_STORAGE_KEY, null);
}

function getGeneratedExports() {
  return readStorage(EXPORTS_STORAGE_KEY, []);
}

function getSelectedSections(selectedSectionIds = []) {
  return reportsData.reportSections.filter((section) =>
    selectedSectionIds.includes(section.id)
  );
}

function escapeCsv(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildCsv(selectedSections, generatedAt) {
  const rows = [
    ['CERA Faculty Workspace'],
    ['Course Report'],
    ['Generated', generatedAt],
    [],
    ['Included Section'],
    ...selectedSections.map((section) => [section.label]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');
}

function buildPdf(lines) {
  const contentLines = [
    'BT',
    '/F1 12 Tf',
    '50 740 Td',
    ...lines.map((line, index) => {
      if (index === 0) {
        return `(${escapePdfText(line)}) Tj`;
      }

      return `0 -18 Td (${escapePdfText(line)}) Tj`;
    }),
    'ET',
  ];

  const content = contentLines.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function buildReport(selectedSections, format, generatedAt) {
  const sectionLines = selectedSections.map(
    (section) => `- ${section.label}`
  );

  if (format === 'CSV workbook') {
    return {
      blob: new Blob(
        [buildCsv(selectedSections, generatedAt)],
        { type: 'text/csv;charset=utf-8' }
      ),
      filename: 'cera-course-report.csv',
    };
  }

  const lines = [
    'CERA Faculty Workspace',
    'Course Report',
    `Generated: ${generatedAt}`,
    '',
    'Included sections:',
    ...sectionLines,
    '',
    'This report was generated from the available frontend report data.',
  ];

  return {
    blob: buildPdf(lines),
    filename: 'cera-course-report.pdf',
  };
}

export const reportService = {
  get: async () => ({
    sections: reportsData.reportSections,
    recentExports: [
      ...getGeneratedExports(),
      ...reportsData.recentExports,
    ],
    savedTemplate: getSavedTemplate(),
  }),

  saveTemplate: async (selectedSectionIds, format) => {
    const template = {
      selectedSectionIds,
      format,
      savedAt: new Date().toISOString(),
    };

    writeStorage(TEMPLATE_STORAGE_KEY, template);

    return template;
  },

  generate: async (options = {}) => {
    const selectedSectionIds = options.selectedSectionIds || [];
    const format = options.format || 'PDF document';

    const selectedSections = getSelectedSections(selectedSectionIds);

    if (selectedSections.length === 0) {
      return null;
    }

    const generatedAt = new Date().toLocaleString();
    const report = buildReport(
      selectedSections,
      format,
      generatedAt
    );

    const exportRecord = {
      id: `generated-${Date.now()}`,
      title: 'CERA Course Report',
      daysAgo: 0,
      format: format === 'CSV workbook' ? 'CSV' : 'PDF',
      size: 'Generated locally',
      selectedSectionIds,
      generatedAt,
    };

    const existingExports = getGeneratedExports();

    writeStorage(EXPORTS_STORAGE_KEY, [
      exportRecord,
      ...existingExports,
    ]);

    return {
      ...options,
      generatedAt,
      selectedSections,
      blob: report.blob,
      filename: report.filename,
      exportRecord,
    };
  },

  download: async (exportRecord) => {
    if (!exportRecord) {
      return null;
    }

    const selectedSectionIds =
      exportRecord.selectedSectionIds ||
      reportsData.reportSections
        .filter((section) => section.defaultSelected)
        .map((section) => section.id);

    return reportService.generate({
      selectedSectionIds,
      format:
        exportRecord.format === 'CSV'
          ? 'CSV workbook'
          : 'PDF document',
    });
  },
};