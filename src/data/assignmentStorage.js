const defaultAssignments = [
  {
    id: 'asg-104',
    title: 'Graph Traversal Lab',
    course: 'CS 301 · Algorithms',
    due: 'Today, 11:59 PM',
    submissions: 68,
    total: 84,
    difficulty: 'Advanced',
    color: '#8B5CF6',
  },
  {
    id: 'asg-103',
    title: 'Memory-safe Linked Lists',
    course: 'CS 204 · Systems',
    due: 'Tomorrow, 5:00 PM',
    submissions: 52,
    total: 72,
    difficulty: 'Intermediate',
    color: '#22D3EE',
  },
  {
    id: 'asg-102',
    title: 'Recursion & Backtracking',
    course: 'CS 301 · Algorithms',
    due: 'Oct 28, 11:59 PM',
    submissions: 91,
    total: 96,
    difficulty: 'Intermediate',
    color: '#10B981',
  },
  {
    id: 'asg-101',
    title: 'Hash Tables from Scratch',
    course: 'CS 204 · Systems',
    due: 'Oct 24, 5:00 PM',
    submissions: 78,
    total: 80,
    difficulty: 'Foundational',
    color: '#F59E0B',
  },
];

export function getAssignments() {
  try {
    const saved = localStorage.getItem(
      'cera-assignments'
    );

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(
      'Error loading assignments:',
      error
    );
  }

  return defaultAssignments;
}

export function getAssignmentById(id) {
  const assignments = getAssignments();

  return (
    assignments.find(
      (assignment) => assignment.id === id
    ) || assignments[0]
  );
}

export function updateAssignment(
  id,
  updatedData
) {
  const assignments = getAssignments();

  const updatedAssignments =
    assignments.map((assignment) =>
      assignment.id === id
        ? {
            ...assignment,
            ...updatedData,
          }
        : assignment
    );

  localStorage.setItem(
    'cera-assignments',
    JSON.stringify(updatedAssignments)
  );

  return updatedAssignments;
}

export function deleteAssignment(id) {
  const assignments = getAssignments();

  const updatedAssignments =
    assignments.filter(
      (assignment) => assignment.id !== id
    );

  localStorage.setItem(
    'cera-assignments',
    JSON.stringify(updatedAssignments)
  );

  return updatedAssignments;
}

export function resetAssignments() {
  localStorage.setItem(
    'cera-assignments',
    JSON.stringify(defaultAssignments)
  );

  return defaultAssignments;
}