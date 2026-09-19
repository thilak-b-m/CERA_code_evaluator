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
        <Route path="/student/dashboard" element={<Dashboard />} />
        <Route path="/student/assignments" element={<Assignments />} />
        <Route path="/student/assignments/:id" element={<AssignmentDetails />} />
        <Route path="/student/submit/:id" element={<CodeSubmission />} />
        <Route path="/student/submissions" element={<Submissions />} />
        <Route path="/student/submissions/:id" element={<SubmissionDetails />} />
        <Route path="/student/results" element={<Results />} />
        <Route path="/student/results/:id" element={<ResultDetails />} />
        <Route path="/student/leaderboard" element={<Leaderboard />} />
        <Route path="/student/notifications" element={<Notifications />} />
        <Route path="/student/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
