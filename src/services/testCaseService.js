import {
  testCases as defaultTestCases,
} from '../data/facultyMockData.js';

const STORAGE_KEY = 'cera-test-cases';

function getAllTestCases() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(
      'Error loading test cases:',
      error
    );
  }

  return defaultTestCases;
}

function saveAllTestCases(testCases) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(testCases)
    );

    return true;
  } catch (error) {
    console.error(
      'Error saving test cases:',
      error
    );

    return false;
  }
}

export function getTestCases(
  assignmentId
) {
  const allTestCases =
    getAllTestCases();

  return allTestCases[
    assignmentId
  ] || [];
}

export function getTestCaseById(
  assignmentId,
  testCaseId
) {
  return getTestCases(
    assignmentId
  ).find(
    (testCase) =>
      testCase.id === testCaseId
  ) || null;
}

export function createTestCase(
  assignmentId,
  data
) {
  const allTestCases =
    getAllTestCases();

  const existing =
    allTestCases[
      assignmentId
    ] || [];

  const newTestCase = {
    ...data,
    id:
      data.id ||
      `TC-${Date.now()}`,
    assignmentId,
  };

  allTestCases[
    assignmentId
  ] = [
    ...existing,
    newTestCase,
  ];

  saveAllTestCases(
    allTestCases
  );

  return newTestCase;
}

export function updateTestCase(
  assignmentId,
  testCaseId,
  data
) {
  const allTestCases =
    getAllTestCases();

  const existing =
    allTestCases[
      assignmentId
    ] || [];

  let updatedTestCase = null;

  const updated =
    existing.map((testCase) => {
      if (
        testCase.id !==
        testCaseId
      ) {
        return testCase;
      }

      updatedTestCase = {
        ...testCase,
        ...data,
        id: testCase.id,
        assignmentId,
      };

      return updatedTestCase;
    });

  if (!updatedTestCase) {
    return null;
  }

  allTestCases[
    assignmentId
  ] = updated;

  saveAllTestCases(
    allTestCases
  );

  return updatedTestCase;
}

export function deleteTestCase(
  assignmentId,
  testCaseId
) {
  const allTestCases =
    getAllTestCases();

  const existing =
    allTestCases[
      assignmentId
    ] || [];

  const deleted =
    existing.find(
      (testCase) =>
        testCase.id === testCaseId
    ) || null;

  if (!deleted) {
    return null;
  }

  allTestCases[
    assignmentId
  ] = existing.filter(
    (testCase) =>
      testCase.id !== testCaseId
  );

  saveAllTestCases(
    allTestCases
  );

  return deleted;
}

export function getTestCaseSummary(
  assignmentId
) {
  const cases =
    getTestCases(
      assignmentId
    );

  return {
    total: cases.length,
    public: cases.filter(
      (testCase) =>
        testCase.visibility ===
        'Public'
    ).length,
    hidden: cases.filter(
      (testCase) =>
        testCase.visibility ===
        'Hidden'
    ).length,
  };
}

export const testCaseService = {
  list: async (assignmentId) =>
    getTestCases(assignmentId),

  get: async (
    assignmentId,
    testCaseId
  ) =>
    getTestCaseById(
      assignmentId,
      testCaseId
    ),

  create: async (
    assignmentId,
    data
  ) =>
    createTestCase(
      assignmentId,
      data
    ),

  update: async (
    assignmentId,
    testCaseId,
    data
  ) =>
    updateTestCase(
      assignmentId,
      testCaseId,
      data
    ),

  delete: async (
    assignmentId,
    testCaseId
  ) =>
    deleteTestCase(
      assignmentId,
      testCaseId
    ),

  summary: async (
    assignmentId
  ) =>
    getTestCaseSummary(
      assignmentId
    ),
};