import EditAssignment from '../pages/faculty/EditAssignment.jsx';
import { Switch, Route, Redirect } from 'wouter';
import FacultyDashboard from '../pages/faculty/FacultyDashboard.jsx';
import LiveLab from '../pages/faculty/LiveLabMonitor.jsx';
import Assignments from '../pages/faculty/Assignments.jsx';
import CreateAssignment from '../pages/faculty/CreateAssignment.jsx';
import AssignmentDetails from '../pages/faculty/AssignmentDetails.jsx';
import TestCases from '../pages/faculty/TestCases.jsx';
import Difficulty from '../pages/faculty/DifficultyAnalysis.jsx';
import Students from '../pages/faculty/Students.jsx';
import StudentProfile from '../pages/faculty/StudentProfile.jsx';
import Submissions from '../pages/faculty/Submissions.jsx';
import SubmissionDetails from '../pages/faculty/SubmissionDetails.jsx';
import EvaluationQueue from '../pages/faculty/EvaluationQueue.jsx';
import Evaluation from '../pages/faculty/Evaluation.jsx';
import AIReview from '../pages/faculty/AIReview.jsx';
import Plagiarism from '../pages/faculty/Plagiarism.jsx';
import PlagiarismCompare from '../pages/faculty/PlagiarismCompare.jsx';
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
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        <FacultyDashboard />
      </Route>

      <Route path="/live-lab">
        <LiveLab />
      </Route>

      <Route path="/assignments/create">
  <CreateAssignment />
</Route>

<Route path="/assignments/:id/edit">
  <EditAssignment />
</Route>

<Route path="/assignments/:id">
  <AssignmentDetails />
</Route>

<Route path="/assignments">
  <Assignments />
</Route>

      <Route path="/test-cases">
        <TestCases />
      </Route>

      <Route path="/difficulty-analysis">
        <Difficulty />
      </Route>

      <Route path="/students/:id">
        <StudentProfile />
      </Route>

      <Route path="/students">
        <Students />
      </Route>

      <Route path="/submissions/:id">
        <SubmissionDetails />
      </Route>

      <Route path="/submissions">
        <Submissions />
      </Route>

      <Route path="/evaluation-queue">
        <EvaluationQueue />
      </Route>

      <Route path="/evaluation/:id">
        <Evaluation />
      </Route>

      <Route path="/ai-review">
        <AIReview />
      </Route>

      <Route path="/plagiarism/compare">
        <PlagiarismCompare />
      </Route>

      <Route path="/plagiarism">
        <Plagiarism />
      </Route>

      <Route path="/analytics">
        <Analytics />
      </Route>

      <Route path="/reports">
        <Reports />
      </Route>

      <Route path="/notifications">
        <Notifications />
      </Route>

      <Route path="/profile">
        <Profile />
      </Route>

      <Route path="/settings">
        <Settings />
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}