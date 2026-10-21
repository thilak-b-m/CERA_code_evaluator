import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from '../layouts/StudentLayout';
import Dashboard from '../pages/student/Dashboard';
import Assignments from '../pages/student/Assignments';
import AssignmentDetails from '../pages/student/AssignmentDetails';
import CodeSubmission from '../pages/student/CodeSubmission';
import Submissions from '../pages/student/Submissions';
import SubmissionDetails from '../pages/student/SubmissionDetails';
import Results from '../pages/student/Results';
import ResultDetails from '../pages/student/ResultDetails';
import Leaderboard from '../pages/student/Leaderboard';
import Notifications from '../pages/student/Notifications';
import Profile from '../pages/student/Profile';

export default function StudentRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="assignments/:id" element={<AssignmentDetails />} />
        <Route path="submit/:id" element={<CodeSubmission />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="submissions/:id" element={<SubmissionDetails />} />
        <Route path="results" element={<Results />} />
        <Route path="results/:id" element={<ResultDetails />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
