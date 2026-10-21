import { api } from './api.js';

export async function getAssignments(token) {
  const result = await api.request('/api/assignments', { token });
  return result.assignments;
}

export async function getAssignmentById(id, token) {
  const result = await api.request(`/api/assignments/${encodeURIComponent(id)}`, { token });
  return result.assignment;
}

export async function updateAssignment(id, updatedData, token) {
  const result = await api.request(`/api/assignments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body: updatedData,
  });
  return result.assignment;
}

export async function deleteAssignment(id, token) {
  await api.request(`/api/assignments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export async function restoreAssignment(id, token) {
  await api.request(`/api/assignments/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
    token,
  });
}

export const assignmentService = {
  list: getAssignments,
  get: getAssignmentById,
  create: async (assignment, token) => {
    const result = await api.request('/api/assignments', {
      method: 'POST',
      token,
      body: assignment,
    });
    return result.assignment;
  },
  update: updateAssignment,
  delete: deleteAssignment,
  restore: restoreAssignment,
};
