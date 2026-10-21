import { getDatabase } from '../../config/database.js';
import { parseReportInput } from './reports.schema.js';
import { buildFacultyReport } from './reports.analytics.service.js';
import {
  createReportExport,
  getReportExport,
  getReportSettings,
  previewReportSections,
  saveReportTemplate,
} from './reports.service.js';

export async function getFacultyReportSettings(request, response, next) {
  try {
    response.json({ reports: await getReportSettings(getDatabase(), request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function saveFacultyReportTemplate(request, response, next) {
  try {
    const template = await saveReportTemplate(
      getDatabase(),
      request.user.id,
      parseReportInput(request.body || {}),
    );
    response.json({ template });
  } catch (error) {
    next(error);
  }
}

export async function createFacultyReportExport(request, response, next) {
  try {
    const report = await createReportExport(
      getDatabase(),
      request.user.id,
      parseReportInput(request.body || {}),
    );
    response.status(201).json({ report });
  } catch (error) {
    next(error);
  }
}

export async function downloadFacultyReportExport(request, response, next) {
  try {
    const report = await getReportExport(
      getDatabase(),
      request.user.id,
      request.params.id,
    );
    response.json({ report });
  } catch (error) {
    next(error);
  }
}

export async function previewFacultyReport(request, response, next) {
  try {
    const { selectedSectionIds } = parseReportInput(request.body || {});
    const sections = await previewReportSections(
      getDatabase(),
      request.user.id,
      selectedSectionIds,
    );
    response.json({ sections });
  } catch (error) {
    next(error);
  }
}

export function getFacultyReport(reportType) {
  return async function facultyReportHandler(request, response, next) {
    try {
      const report = await buildFacultyReport(
        getDatabase(),
        request.user.id,
        { ...request.query, type: reportType },
      );
      response.json({ report });
    } catch (error) {
      next(error);
    }
  };
}
