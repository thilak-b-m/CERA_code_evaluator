import { students as defaultStudents } from '../data/facultyMockData.js';

export function getStudents() {
  return [...defaultStudents];
}

export function getStudentById(id) {
  return (
    getStudents().find(
      (student) => student.id === id
    ) || null
  );
}

export const studentService = {
  list: () => getStudents(),

  get: (id) => getStudentById(id),
};