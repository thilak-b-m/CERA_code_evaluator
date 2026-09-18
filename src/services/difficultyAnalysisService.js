import {
  difficultyAnalysisData,
} from '../data/facultyMockData.js';

import {
  getAssignments,
} from './assignmentService.js';

const STORAGE_KEY =
  'cera-difficulty-recommendations';

function getAppliedRecommendations() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    return saved
      ? JSON.parse(saved)
      : {};
  } catch (error) {
    console.error(
      'Error loading difficulty recommendations:',
      error
    );

    return {};
  }
}

function saveAppliedRecommendations(
  recommendations
) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(recommendations)
    );

    return true;
  } catch (error) {
    console.error(
      'Error saving difficulty recommendations:',
      error
    );

    return false;
  }
}

function getAnalysisForAssignment(
  assignment
) {
  if (!assignment) {
    return null;
  }

  /*
   * Prefer assignment ID.
   *
   * The title fallback keeps this service
   * compatible with older mock-data versions.
   */
  return (
    difficultyAnalysisData[
      assignment.id
    ] ||
    difficultyAnalysisData[
      assignment.title
    ] ||
    null
  );
}

export function getAvailableAssignments() {
  return getAssignments().filter(
    (assignment) =>
      Boolean(
        getAnalysisForAssignment(
          assignment
        )
      )
  );
}

export function getDifficultyAnalysis(
  assignmentId
) {
  const assignments =
    getAssignments();

  const assignment =
    assignments.find(
      (item) =>
        item.id === assignmentId
    );

  if (!assignment) {
    return null;
  }

  const analysis =
    getAnalysisForAssignment(
      assignment
    );

  if (!analysis) {
    return null;
  }

  const appliedRecommendations =
    getAppliedRecommendations();

  return {
    assignment,
    analysis,
    recommendationApplied:
      Boolean(
        appliedRecommendations[
          assignment.id
        ]
      ),
  };
}

export function applyRecommendation(
  assignmentId
) {
  const result =
    getDifficultyAnalysis(
      assignmentId
    );

  if (!result) {
    return null;
  }

  const appliedRecommendations =
    getAppliedRecommendations();

  const appliedAt =
    new Date().toISOString();

  const updated = {
    ...appliedRecommendations,
    [assignmentId]: {
      appliedAt,
      title:
        result.analysis
          .recommendationTitle,
    },
  };

  saveAppliedRecommendations(
    updated
  );

  return {
    ...result,
    recommendationApplied: true,
    recommendationAppliedAt:
      appliedAt,
  };
}

export const difficultyAnalysisService = {
  listAssignments:
    getAvailableAssignments,

  get:
    getDifficultyAnalysis,

  applyRecommendation,
};