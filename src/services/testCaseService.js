import { api } from './api.js';

function resourcePath(assignmentId, testCaseId) {
  const base = `/api/assignments/${encodeURIComponent(assignmentId)}/test-cases`;
  return testCaseId ? `${base}/${encodeURIComponent(testCaseId)}` : base;
}

export const testCaseService = {
  list: async (assignmentId, token) => {
    const result = await api.request(resourcePath(assignmentId), { token });
    return result.testCases;
  },

  summary: async (assignmentId, token) => {
    const cases = await testCaseService.list(assignmentId, token);
    return {
      total: cases.length,
      public: cases.filter((testCase) => testCase.visibility === 'Public').length,
      hidden: cases.filter((testCase) => testCase.visibility === 'Hidden').length,
    };
  },

  create: async (assignmentId, data, token) => {
    const result = await api.request(resourcePath(assignmentId), {
      method: 'POST',
      token,
      body: data,
    });
    return result.testCase;
  },

  update: async (assignmentId, testCaseId, data, token) => {
    const result = await api.request(resourcePath(assignmentId, testCaseId), {
      method: 'PATCH',
      token,
      body: data,
    });
    return result.testCase;
  },

  delete: async (assignmentId, testCaseId, token) => {
    await api.request(resourcePath(assignmentId, testCaseId), {
      method: 'DELETE',
      token,
    });
  },
};
