import {
  currentUser,
  dashboardStats,
  weeklyActivity,
  scoreProgression,
  assignmentCompletion,
  upcomingAssignments,
  recentSubmissions,
  achievements,
  allAssignments,
  assignmentDetails,
  allSubmissions,
  submissionDetails,
  allResults,
  resultDetails,
  leaderboard,
  notifications,
  profileData,
  codeTemplates,
  mockTestCases,
  mockRunResults,
} from '../data/studentMockData';
import { students } from '../data/facultyMockData.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const studentService = {
  list() {
    return students;
  },

  addStudent({ name, usn, email, year }) {
    const normalizedUsn = usn.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const duplicateUsn = students.some(
      (student) => student.id.toLowerCase() === normalizedUsn.toLowerCase()
    );
    const duplicateEmail = students.some(
      (student) => student.email.toLowerCase() === normalizedEmail
    );

    if (duplicateUsn) {
      throw new Error('A student with this USN already exists.');
    }

    if (duplicateEmail) {
      throw new Error('A student with this email already exists.');
    }

    const initials = name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const colors = ['#0E7490', '#10B981', '#F59E0B', '#6366F1', '#E11D48'];
    const student = {
      id: normalizedUsn,
      usn: normalizedUsn,
      name: name.trim(),
      email: normalizedEmail,
      year,
      initials,
      score: 0,
      labs: '0 / 12',
      status: 'Needs review',
      last: 'Just added',
      color: colors[students.length % colors.length],
    };

    students.unshift(student);
    return student;
  },

  async getDashboardStats() {
    await delay(300);
    return dashboardStats;
  },

  async getWeeklyActivity() {
    await delay(300);
    return weeklyActivity;
  },

  async getScoreProgression() {
    await delay(300);
    return scoreProgression;
  },

  async getAssignmentCompletion() {
    await delay(300);
    return assignmentCompletion;
  },

  async getUpcomingAssignments() {
    await delay(300);
    return upcomingAssignments;
  },

  async getRecentSubmissions() {
    await delay(300);
    return recentSubmissions;
  },

  async getAchievements() {
    await delay(300);
    return achievements;
  },

  async getCurrentUser() {
    await delay(200);
    return currentUser;
  },

  async getAssignments() {
    await delay(400);
    return allAssignments;
  },

  async getAssignmentById(id) {
    await delay(400);
    return assignmentDetails[id] || allAssignments.find((a) => a.id === id);
  },

  async getSubmissions() {
    await delay(400);
    return allSubmissions;
  },

  async getSubmissionById(id) {
    await delay(400);
    return submissionDetails[id] || allSubmissions.find((s) => s.id === id);
  },

  async getResults() {
    await delay(400);
    return allResults;
  },

  async getResultById(id) {
    await delay(400);
    return resultDetails[id] || allResults.find((r) => r.id === id);
  },

  async getLeaderboard(period = 'weekly') {
    await delay(400);
    return leaderboard[period] || leaderboard.weekly;
  },

  async getNotifications() {
    await delay(300);
    return notifications;
  },

  async getProfile() {
    await delay(300);
    return profileData;
  },

  async updateProfile(updatedData) {
    await delay(500);
    return { ...profileData, ...updatedData };
  },

  getCodeTemplate(language) {
    return codeTemplates[language] || codeTemplates.python;
  },

  getTestCases() {
    return mockTestCases;
  },

  async runCode() {
    await delay(2000);
    return mockRunResults;
  },

  async submitCode() {
    await delay(1500);
    return {
      success: true,
      submissionId: `SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      score: 95,
      testCasesPassed: 5,
      totalTestCases: 5,
      status: 'Passed',
    };
  },
};
