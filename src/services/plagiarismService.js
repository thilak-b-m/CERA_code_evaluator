import { plagiarismData } from '../data/facultyMockData.js';

const REVIEWED_STORAGE_KEY = 'cera-plagiarism-reviewed';

function getReviewedCases() {
  try {
    const saved = localStorage.getItem(
      REVIEWED_STORAGE_KEY
    );

    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error(
      'Error loading plagiarism review state:',
      error
    );

    return {};
  }
}

function saveReviewedCases(reviewedCases) {
  try {
    localStorage.setItem(
      REVIEWED_STORAGE_KEY,
      JSON.stringify(reviewedCases)
    );

    return true;
  } catch (error) {
    console.error(
      'Error saving plagiarism review state:',
      error
    );

    return false;
  }
}

export const plagiarismService = {
  getOverview: () => plagiarismData,

  getComparison: () => {
    const comparison = plagiarismData.comparison;

    if (!comparison) {
      return null;
    }

    const reviewedCases = getReviewedCases();
    const caseId = `${comparison.left.id}-${comparison.right.id}`;

    return {
      ...comparison,
      caseId,
      reviewed: Boolean(reviewedCases[caseId]),
    };
  },

  markComparisonReviewed: () => {
    const comparison = plagiarismData.comparison;

    if (!comparison) {
      return null;
    }

    const reviewedCases = getReviewedCases();
    const caseId = `${comparison.left.id}-${comparison.right.id}`;

    const reviewedAt = new Date().toISOString();

    const updated = {
      ...reviewedCases,
      [caseId]: {
        reviewedAt,
      },
    };

    saveReviewedCases(updated);

    return {
      caseId,
      reviewed: true,
      reviewedAt,
    };
  },
};