import { Navigate, Route, Routes } from 'react-router-dom';
import EditAssignment from '../pages/faculty/EditAssignment.jsx';
import FacultyDashboard from '../pages/faculty/FacultyDashboard.jsx';
import LiveLab from '../pages/faculty/LiveLabMonitor.jsx';
import Assignments from '../pages/faculty/Assignments.jsx';
import CreateAssignment from '../pages/faculty/CreateAssignment.jsx';
import AssignmentDetails from '../pages/faculty/AssignmentDetails.jsx';
import TestCases from '../pages/faculty/TestCases.jsx';
import TestCaseDetails from '../pages/faculty/TestCaseDetails.jsx';
import Students from '../pages/faculty/Students.jsx';
import AcademicYears from '../pages/faculty/AcademicYears.jsx';
import StudentProfile from '../pages/faculty/StudentProfile.jsx';
import Submissions from '../pages/faculty/Submissions.jsx';
import SubmissionDetails from '../pages/faculty/SubmissionDetails.jsx';
import EvaluationQueue from '../pages/faculty/EvaluationQueue.jsx';
import Evaluation from '../pages/faculty/Evaluation.jsx';
import Analytics from '../pages/faculty/Analytics.jsx';
import Reports from '../pages/faculty/Reports.jsx';
import Notifications from '../pages/faculty/Notifications.jsx';
import Profile from '../pages/faculty/Profile.jsx';
import Settings from '../pages/faculty/Settings.jsx';

function NotFound() {
  return <div>Page not found</div>;
}

export default function FacultyRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<FacultyDashboard />} />
      <Route path="/live-lab" element={<LiveLab />} />
      <Route path="/assignments/create" element={<CreateAssignment />} />
      <Route path="/assignments/:id/edit" element={<EditAssignment />} />
      <Route path="/assignments/:id" element={<AssignmentDetails />} />
      <Route path="/assignments" element={<Assignments />} />
      <Route path="/test-cases/:assignmentId" element={<TestCaseDetails />} />
      <Route path="/test-cases" element={<TestCases />} />
      <Route path="/students/academic-years" element={<AcademicYears />} />
      <Route path="/students/:id" element={<StudentProfile />} />
      <Route path="/students" element={<Students />} />
      <Route path="/submissions/:id" element={<SubmissionDetails />} />
      <Route path="/submissions" element={<Submissions />} />
      <Route path="/evaluation-queue" element={<EvaluationQueue />} />
      <Route path="/evaluation/:id" element={<Evaluation />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
