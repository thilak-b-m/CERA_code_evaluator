import { assignments as defaultAssignments } from '../data/facultyMockData.js';
const STORAGE_KEY = 'cera-assignments';


export function getAssignments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading assignments:', error);
  }

  return defaultAssignments;
}

export function getAssignmentById(id) {
  const assignments = getAssignments();

  return assignments.find(
    (assignment) => assignment.id === id
  );
}

export function saveAssignments(assignments) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(assignments)
    );

    return true;
  } catch (error) {
    console.error('Error saving assignments:', error);
    return false;
  }
}

export function updateAssignment(id, updatedData) {
  const assignments = getAssignments();

  const updatedAssignments = assignments.map(
    (assignment) =>
      assignment.id === id
        ? {
            ...assignment,
            ...updatedData,
          }
        : assignment
  );

  saveAssignments(updatedAssignments);

  return updatedAssignments.find(
    (assignment) => assignment.id === id
  );
}

export function deleteAssignment(id) {
  const assignments = getAssignments();

  const deletedAssignment = assignments.find(
    (assignment) => assignment.id === id
  );

  const remainingAssignments = assignments.filter(
    (assignment) => assignment.id !== id
  );

  saveAssignments(remainingAssignments);

  return deletedAssignment;
}

export function restoreAssignment(assignment) {
  if (!assignment) {
    return getAssignments();
  }

  const assignments = getAssignments();

  const alreadyExists = assignments.some(
    (item) => item.id === assignment.id
  );

  if (alreadyExists) {
    return assignments;
  }

  const restoredAssignments = [
    ...assignments,
    assignment,
  ];

  saveAssignments(restoredAssignments);

  return restoredAssignments;
}

export function resetAssignments() {
  saveAssignments(defaultAssignments);

  return defaultAssignments;
}

/*
 * Keep the original service-style API too,
 * so other files using assignmentService
 * don't break.
 */
export const assignmentService = {
  list: async () => {
    return getAssignments();
  },

  create: async (assignment) => {
    const assignments = getAssignments();

    const newAssignment = {
      id: `asg-${Date.now()}`,
      ...assignment,
    };

    saveAssignments([
      ...assignments,
      newAssignment,
    ]);

    return newAssignment;
  },

  update: async (id, assignment) => {
    return updateAssignment(id, assignment);
  },

  delete: async (id) => {
    return deleteAssignment(id);
  },
};